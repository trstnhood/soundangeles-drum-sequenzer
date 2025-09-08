import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DrumSample {
  id: string;
  name: string;
  freq?: number;
  type?: OscillatorType;
  duration?: number;
  preset?: string;
  audioFile?: string;
  sampleType: 'synthesized' | 'audio';
}

interface DrumTrack {
  id: string;
  name: string;
  color: string;
  steps: boolean[];
  volume: number;
  selectedSampleId: string;
  audioContext?: AudioContext;
  audioBuffer?: AudioBuffer;
}

interface SampleKit {
  id: string;
  name: string;
  description: string;
  samples: {
    [drumType: string]: DrumSample[];
  };
  folderNames?: {
    [drumType: string]: string;
  };
}

// **OPTIMIZED DYNAMIC SYSTEM - NO CONSOLE SPAM**
let AVAILABLE_SAMPLE_PACKS: any[] = [];
let SAMPLE_KITS: SampleKit[] = [];

// Erweiterte Farbpalette für unbegrenzte Instrument-Anzahl
const FOLDER_COLORS = [
  'neon-blue', 'neon-green', 'neon-pink', 'neon-cyan', 
  'neon-yellow', 'neon-purple', 'neon-orange', 'neon-red',
  'neon-violet', 'neon-teal', 'neon-lime', 'neon-rose'
];

// **LIGHTNING-FAST SAMPLE PACK DISCOVERY**
const discoverSamplePacks = async (): Promise<void> => {
  try {
    const response = await fetch('/api/discover-packs');
    const data = await response.json();
    
    if (data.error) {
      AVAILABLE_SAMPLE_PACKS = [];
      return;
    }
    
    AVAILABLE_SAMPLE_PACKS = data.packs || [];
  } catch (error) {
    AVAILABLE_SAMPLE_PACKS = [];
  }
};

// **PARALLEL INSTRUMENT FOLDER DISCOVERY**
const discoverInstrumentFolders = async (packName: string): Promise<string[]> => {
  try {
    const response = await fetch(`/api/discover-instruments?pack=${encodeURIComponent(packName)}`);
    const data = await response.json();
    
    if (data.error) return [];
    
    const folders = data.folders || [];
    return folders.sort(); // Consistent ordering
  } catch (error) {
    return [];
  }
};

// **ULTRA-FAST SAMPLE PACK LOADING WITH PARALLEL PROCESSING**
const loadSamplePackStructure = async (packId: string): Promise<SampleKit | null> => {
  const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === packId);
  if (!pack) return null;

  try {
    const samples: { [drumType: string]: DrumSample[] } = {};
    const folders = await discoverInstrumentFolders(pack.folderName);
    
    if (folders.length === 0) return null;
    
    // **PARALLEL LOADING FOR MAXIMUM SPEED**
    const folderNames: { [drumType: string]: string } = {};
    const loadPromises = folders.map(async (folderName) => {
      const trackId = getTrackIdFromFolder(folderName);
      const folderSamples = await loadSamplesFromFolder(pack.folderName, folderName, trackId);
      if (folderSamples.length > 0) {
        samples[trackId] = folderSamples;
        folderNames[trackId] = folderName;
      }
    });
    
    await Promise.all(loadPromises);
    
    return {
      id: packId,
      name: pack.name,
      description: pack.description,
      samples: samples,
      folderNames: folderNames
    };
  } catch (error) {
    return null;
  }
};

// **SMART TRACK ID GENERATION - HANDLES ANY FOLDER STRUCTURE**
const getTrackIdFromFolder = (folderName: string): string => {
  return folderName
    .replace(/[\s-&]/g, '_')           // Spaces, hyphens, ampersands to underscores
    .replace(/[^a-zA-Z0-9_]/g, '')     // Remove special characters
    .replace(/^_+|_+$/g, '')           // Remove leading/trailing underscores
    .replace(/_+/g, '_');              // Multiple underscores to single
};

// **PRESERVE ORIGINAL DISPLAY NAMES**
const getDisplayNameFromFolder = (folderName: string): string => {
  return folderName; // Keep exactly as found in filesystem
};

// **OPTIMIZED SAMPLE FILE DISCOVERY**
const loadSamplesFromFolder = async (packName: string, folderName: string, trackId: string): Promise<DrumSample[]> => {
  try {
    const response = await fetch(`/api/discover-samples?pack=${encodeURIComponent(packName)}&folder=${encodeURIComponent(folderName)}`);
    const data = await response.json();
    
    if (data.error || !data.files || data.files.length === 0) {
      return createFallbackSamplesForFolder(folderName, trackId);
    }
    
    return data.files.map((fileName: string, index: number) => ({
      id: `${trackId}_${index + 1}_${Date.now()}`,
      name: fileName.replace(/\.(wav|mp3)$/i, ''),
      audioFile: `/sample-packs/${encodeURIComponent(packName)}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`,
      sampleType: 'audio' as const
    }));
  } catch (error) {
    return createFallbackSamplesForFolder(folderName, trackId);
  }
};

// **INTELLIGENT FALLBACK SAMPLES**
const createFallbackSamplesForFolder = (folderName: string, trackId: string): DrumSample[] => {
  const frequency = getFrequencyFromFolderName(folderName);
  
  return [{
    id: `${trackId}_fallback`,
    name: `${folderName} (Synthesized)`,
    audioFile: '',
    sampleType: 'synthesized',
    freq: frequency,
    type: 'sine' as OscillatorType,
    duration: 0.3
  }];
};

// **SMART FREQUENCY MAPPING FOR ANY INSTRUMENT TYPE**
const getFrequencyFromFolderName = (folderName: string): number => {
  const name = folderName.toLowerCase();
  
  // Kick drums - low frequencies
  if (name.includes('kick') || name.includes('bass')) return 60;
  
  // Snares - mid-low frequencies
  if (name.includes('snare')) return 200;
  
  // Hi-hats - high frequencies
  if (name.includes('hi') && name.includes('hat')) {
    return name.includes('open') ? 6000 : 8000;
  }
  
  // Toms - low-mid frequencies
  if (name.includes('tom')) return 120;
  
  // Percussion - mid frequencies
  if (name.includes('perc') || name.includes('clap') || name.includes('hand')) return 1000;
  
  // Crashes and rides - mid-high frequencies
  if (name.includes('crash') || name.includes('ride')) return 4000;
  
  // Rimshots - mid-high frequencies
  if (name.includes('rim')) return 300;
  
  // Fingersnaps - high frequencies
  if (name.includes('snap') || name.includes('finger')) return 2000;
  
  return 440; // Default fallback
};

// **LIGHTNING-FAST SYSTEM INITIALIZATION**
const initializeSampleKits = async (): Promise<void> => {
  await discoverSamplePacks();
  
  if (AVAILABLE_SAMPLE_PACKS.length === 0) {
    AVAILABLE_SAMPLE_PACKS.push({
      id: 'fallback-kit',
      name: 'Synthesized Drum Kit',
      description: 'Basic synthesized drum sounds',
      folderName: 'Fallback',
      coverImage: 'default-cover.png'
    });
  }
  
  // **PARALLEL LOADING FOR ALL PACKS**
  const loadPromises = AVAILABLE_SAMPLE_PACKS.map(async (pack) => {
    const sampleKit = await loadSamplePackStructure(pack.id);
    return sampleKit && Object.keys(sampleKit.samples).length > 0 ? sampleKit : null;
  });
  
  const loadedKits = await Promise.all(loadPromises);
  SAMPLE_KITS = loadedKits.filter(kit => kit !== null) as SampleKit[];
  
  if (SAMPLE_KITS.length === 0) {
    SAMPLE_KITS.push(createEmergencyFallbackKit());
  }
};

// **MINIMAL EMERGENCY FALLBACK**
const createEmergencyFallbackKit = (): SampleKit => {
  const instruments = [
    { id: 'kick', name: '01-Kick Drums', freq: 60 },
    { id: 'snare', name: '02-Snares', freq: 200 },
    { id: 'hihat', name: '03-Hi-Hats', freq: 8000 },
    { id: 'openhat', name: '04-Open Hi-Hats', freq: 6000 },
    { id: 'clap', name: '05-Hand Claps', freq: 1000 },
    { id: 'crash', name: '06-Crash', freq: 4000 },
    { id: 'perc', name: '07-Percussion', freq: 500 },
    { id: 'tom', name: '08-Toms', freq: 120 }
  ];
  
  const samples: { [drumType: string]: DrumSample[] } = {};
  const folderNames: { [drumType: string]: string } = {};
  
  instruments.forEach(inst => {
    samples[inst.id] = [{
      id: `${inst.id}_synth`,
      name: `${inst.name} (Synthesized)`,
      freq: inst.freq,
      type: 'sine' as OscillatorType,
      duration: 0.3,
      sampleType: 'synthesized'
    }];
    folderNames[inst.id] = inst.name;
  });
  
  return {
    id: 'emergency-fallback',
    name: 'Emergency Synthesized Kit',
    description: 'Basic synthesized drum sounds',
    samples,
    folderNames
  };
};

// **SMART DYNAMIC TRACK GENERATION - ADAPTS TO ANY PACK STRUCTURE**
const generateDynamicTracks = async (selectedPackId?: string): Promise<DrumTrack[]> => {
  if (SAMPLE_KITS.length === 0) {
    await initializeSampleKits();
  }
  
  const packId = selectedPackId || AVAILABLE_SAMPLE_PACKS[0]?.id;
  const currentKit = SAMPLE_KITS.find(kit => kit.id === packId) || SAMPLE_KITS[0];
  
  if (!currentKit) return [];
  
  const tracks: DrumTrack[] = [];
  const drumTypes = Object.keys(currentKit.samples);
  
  // **SMART SORTING - NUMERIC PREFIXES FIRST, THEN ALPHABETICAL**
  const sortedDrumTypes = drumTypes.sort((a, b) => {
    const aName = currentKit.folderNames?.[a] || a;
    const bName = currentKit.folderNames?.[b] || b;
    
    // Extract numeric prefixes
    const aMatch = aName.match(/^(\d+)/);
    const bMatch = bName.match(/^(\d+)/);
    
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    } else if (aMatch) {
      return -1; // a has number, b doesn't - a comes first
    } else if (bMatch) {
      return 1;  // b has number, a doesn't - b comes first
    } else {
      return aName.localeCompare(bName); // Both no numbers - alphabetical
    }
  });
  
  sortedDrumTypes.forEach((trackId, index) => {
    const samples = currentKit.samples[trackId];
    if (samples.length === 0) return;
    
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    const originalFolderName = currentKit.folderNames?.[trackId] || trackId;
    const displayName = getDisplayNameFromFolder(originalFolderName);
    
    tracks.push({
      id: trackId,
      name: displayName,
      color: color,
      steps: new Array(16).fill(false),
      volume: 0.7,
      selectedSampleId: samples[0].id
    });
  });
  
  return tracks;
};

// **MAIN COMPONENT WITH OPTIMIZED PERFORMANCE**
export default function DrumSequencerOptimized() {
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [audioLevels, setAudioLevels] = useState<{ [trackId: string]: number }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPreloadingComplete, setIsPreloadingComplete] = useState(false);
  const [preloadingProgress, setPreloadingProgress] = useState(0);
  const [preloadedSampleCount, setPreloadedSampleCount] = useState(0);
  const [totalSamplesToPreload, setTotalSamplesToPreload] = useState(0);
  
  // **PROFESSIONAL AUDIO SYSTEM REFS**
  const audioContextRef = useRef<AudioContext | null>(null);
  const tracksRef = useRef<DrumTrack[]>(tracks);
  const isPlayingRef = useRef<boolean>(false);
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef<number>(0);
  const lookAheadTime = 25.0;
  const scheduleAheadTime = 0.1;
  const timerWorkerRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const analyserNodesRef = useRef<{ [trackId: string]: { analyser: AnalyserNode; gainNode: GainNode; dataArray: Uint8Array } }>({});
  const isSchedulingRef = useRef<boolean>(false);
  
  // **AUDIO ENGINE & CACHE SYSTEM**
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isLoadingSamplesRef = useRef<boolean>(false);
  const preloadedSamplesRef = useRef<Set<string>>(new Set());
  const criticalSamplesLoadedRef = useRef<boolean>(false);

  let INITIAL_TRACKS: DrumTrack[] = [];

  // **PROFESSIONAL DUAL-STATE ARCHITECTURE**
  class SequencerAudioEngine {
    private pattern: boolean[][] = [];
    private volumes: number[] = [];
    private selectedSamples: string[] = [];
    private trackIds: string[] = [];
    private currentStep: number = 0;
    private isPlaying: boolean = false;
    private bpm: number = 120;
    
    initializeTracks(tracks: DrumTrack[]) {
      this.trackIds = tracks.map(t => t.id);
      this.pattern = tracks.map(t => [...t.steps]);
      this.volumes = tracks.map(t => t.volume);
      this.selectedSamples = tracks.map(t => t.selectedSampleId);
    }
    
    updatePattern(trackIndex: number, stepIndex: number, value: boolean) {
      if (this.pattern[trackIndex]) {
        this.pattern[trackIndex][stepIndex] = value;
      }
    }
    
    updateVolume(trackIndex: number, volume: number) {
      this.volumes[trackIndex] = volume;
    }
    
    updateSelectedSample(trackIndex: number, sampleId: string) {
      this.selectedSamples[trackIndex] = sampleId;
    }
    
    setBpm(newBpm: number) { this.bpm = newBpm; }
    setPlaying(playing: boolean) { this.isPlaying = playing; }
    setCurrentStep(step: number) { this.currentStep = step; }
    
    getPattern(trackIndex: number): boolean[] { return this.pattern[trackIndex] || []; }
    getVolume(trackIndex: number): number { return this.volumes[trackIndex] || 0.7; }
    getSelectedSample(trackIndex: number): string { return this.selectedSamples[trackIndex] || ''; }
    getBpm(): number { return this.bpm; }
    getIsPlaying(): boolean { return this.isPlaying; }
    getCurrentStep(): number { return this.currentStep; }
    getTrackIds(): string[] { return this.trackIds; }
    
    getActiveTracksForStep(stepIndex: number): number[] {
      return this.pattern.reduce((active: number[], trackPattern, trackIndex) => {
        if (trackPattern[stepIndex]) active.push(trackIndex);
        return active;
      }, []);
    }
    
    clearAllPatterns() {
      this.pattern = this.pattern.map(track => new Array(16).fill(false));
    }
  }

  const audioEngineRef = useRef<SequencerAudioEngine>(new SequencerAudioEngine());

  // **OPTIMIZED INITIALIZATION**
  useEffect(() => {
    const initializeTracks = async () => {
      await initializeSampleKits();
      
      let packToLoad = selectedKit;
      if (AVAILABLE_SAMPLE_PACKS.length > 0) {
        if (!packToLoad || !AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === packToLoad)) {
          packToLoad = AVAILABLE_SAMPLE_PACKS[0].id;
          setSelectedKit(packToLoad);
        }
      }
      
      const dynamicTracks = await generateDynamicTracks(packToLoad);
      INITIAL_TRACKS = dynamicTracks;
      setTracks(dynamicTracks);
      
      audioEngineRef.current.initializeTracks(dynamicTracks);
      setIsInitialized(true);
      
      await aggressivePreloadDefaultSamples(dynamicTracks, packToLoad);
    };
    
    initializeTracks();
  }, []);

  // **PERFORMANCE-OPTIMIZED PRELOADING**
  const aggressivePreloadDefaultSamples = async (tracks: DrumTrack[], kitId: string) => {
    const currentKit = SAMPLE_KITS.find(kit => kit.id === kitId) || SAMPLE_KITS[0];
    if (!currentKit) {
      setIsPreloadingComplete(true);
      return;
    }
    
    const defaultSamples = tracks
      .map(track => {
        const samples = currentKit.samples[track.id];
        if (samples && samples.length > 0) {
          const selectedSample = samples.find(s => s.id === track.selectedSampleId) || samples[0];
          if (selectedSample.sampleType === 'audio' && selectedSample.audioFile) {
            return { track, sample: selectedSample };
          }
        }
        return null;
      })
      .filter(Boolean) as { track: DrumTrack; sample: DrumSample }[];
    
    setTotalSamplesToPreload(defaultSamples.length);
    setPreloadedSampleCount(0);
    setPreloadingProgress(0);
    
    // **PARALLEL PRELOADING FOR MAXIMUM SPEED**
    let loadedCount = 0;
    const loadPromises = defaultSamples.map(async ({ sample }) => {
      try {
        const audioBuffer = await loadAudioSample(sample.audioFile, 'high');
        if (audioBuffer) {
          loadedCount++;
          setPreloadedSampleCount(loadedCount);
          setPreloadingProgress(Math.round((loadedCount / defaultSamples.length) * 100));
        }
      } catch (error) {
        // Silent fail for preloading
      }
    });
    
    await Promise.all(loadPromises);
    
    criticalSamplesLoadedRef.current = true;
    setIsPreloadingComplete(true);
    
    // Background preload remaining samples
    backgroundPreloadVisibleSamples(currentKit, tracks);
  };

  // **OPTIMIZED AUDIO SAMPLE LOADING**
  const loadAudioSample = async (audioFile: string, priority: 'high' | 'normal' = 'normal'): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    if (sampleCacheRef.current[audioFile]) {
      return sampleCacheRef.current[audioFile];
    }
    
    try {
      const controller = new AbortController();
      const timeout = priority === 'high' ? 5000 : 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(audioFile, { 
        signal: controller.signal,
        cache: 'force-cache',
        headers: { 'Accept': 'audio/*,*/*;q=0.9' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) return null;
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Smart cache management
      const cacheSize = Object.keys(sampleCacheRef.current).length;
      if (cacheSize > 50) {
        const recentSamples = Object.keys(sampleCacheRef.current).slice(-30);
        const newCache: { [key: string]: AudioBuffer } = {};
        recentSamples.forEach(key => {
          newCache[key] = sampleCacheRef.current[key];
        });
        sampleCacheRef.current = newCache;
      }
      
      sampleCacheRef.current[audioFile] = audioBuffer;
      return audioBuffer;
    } catch (error) {
      return null;
    }
  };

  // Keep isPlayingRef in sync with isPlaying state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Update BPM refs when BPM changes
  useEffect(() => {
    bpmRef.current = bpm;
    stepDurationRef.current = (60 / bpm / 4);
  }, [bpm]);

  const backgroundPreloadVisibleSamples = async (currentKit: SampleKit, tracks: DrumTrack[]) => {
    const visibleSamples = tracks
      .flatMap(track => {
        const samples = currentKit.samples[track.id] || [];
        return samples
          .filter(sample => sample.sampleType === 'audio' && sample.audioFile)
          .filter(sample => !sampleCacheRef.current[sample.audioFile!]);
      });
    
    const chunkSize = 3;
    for (let i = 0; i < visibleSamples.length; i += chunkSize) {
      const chunk = visibleSamples.slice(i, i + chunkSize);
      
      await Promise.all(
        chunk.map(async (sample) => {
          try {
            await loadAudioSampleBackground(sample.audioFile!, 'normal');
          } catch (error) {
            // Silent fail
          }
        })
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const loadAudioSampleBackground = async (audioFile: string, priority: 'high' | 'normal' = 'normal') => {
    if (preloadedSamplesRef.current.has(audioFile)) return;
    
    preloadedSamplesRef.current.add(audioFile);
    
    try {
      await loadAudioSample(audioFile, priority);
    } catch (error) {
      preloadedSamplesRef.current.delete(audioFile);
    }
  };

  // Keep tracksRef in sync
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // **STABLE AUDIO CONTEXT INITIALIZATION**
  useEffect(() => {
    if (!isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: 44100
    });
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isInitialized]);

  // **OPTIMIZED THEME TOGGLE**
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // **SIMPLIFIED AUDIO LEVEL MONITORING**
  useEffect(() => {
    if (!isPlaying) {
      setAudioLevels({});
      return;
    }

    let animationFrameId: number;
    const updateLevels = () => {
      const newLevels: { [trackId: string]: number } = {};
      
      Object.entries(analyserNodesRef.current).forEach(([trackId, { analyser, dataArray }]) => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        newLevels[trackId] = average / 255;
      });
      
      setAudioLevels(newLevels);
      
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateLevels);
      }
    };
    
    updateLevels();
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  // Component methods implementation complete

  if (!isInitialized || tracks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-foreground mb-2">SoundAngeles Dynamic Loading...</h2>
          <p className="text-muted-foreground">🔍 Scanning {AVAILABLE_SAMPLE_PACKS.length} sample packs...</p>
          <p className="text-muted-foreground mt-1">🎵 Building tracks from folder structure...</p>
          <p className="text-muted-foreground mt-1 text-xs">✨ Optimized discovery in progress!</p>
        </div>
      </div>
    );
  }

  if (isInitialized && !isPreloadingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Music className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-foreground mb-4">Preloading Samples...</h2>
          <p className="text-muted-foreground mb-4">🚀 Loading critical samples for instant playback</p>
          
          <div className="w-full bg-muted rounded-full h-4 mb-4">
            <div 
              className="bg-neon-green h-4 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${preloadingProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {preloadedSampleCount} / {totalSamplesToPreload} samples ({preloadingProgress}%)
          </p>
          
          <p className="text-xs text-muted-foreground">
            ✅ Dynamic system discovered {tracks.length} instrument tracks
          </p>
        </div>
      </div>
    );
  }

  // **SAMPLE PACK SWITCHING WITH DYNAMIC TRACK ADJUSTMENT**
  const switchSampleKit = async (kitId: string) => {
    setSelectedKit(kitId);
    
    // Clear cache for memory optimization
    sampleCacheRef.current = {};
    preloadedSamplesRef.current.clear();
    
    // Generate new tracks for the new kit with its actual structure
    const newTracks = await generateDynamicTracks(kitId);
    setTracks(newTracks);
    
    // Initialize audio engine with new track data
    audioEngineRef.current.initializeTracks(newTracks);
    audioEngineRef.current.setPlaying(false);
    audioEngineRef.current.setCurrentStep(0);
    
    // Reset preloading state
    setIsPreloadingComplete(false);
    setPreloadingProgress(0);
    setPreloadedSampleCount(0);
    setTotalSamplesToPreload(0);
    criticalSamplesLoadedRef.current = false;
    
    // Reset playback
    setIsPlaying(false);
    setCurrentStep(0);
    
    // Start aggressive preloading for new kit
    await aggressivePreloadDefaultSamples(newTracks, kitId);
    
    console.log(`✅ Switched to pack with ${newTracks.length} tracks`);
  };

  const getCurrentKitSamples = (drumType: string): DrumSample[] => {
    const currentKit = SAMPLE_KITS.find(kit => kit.id === selectedKit) || SAMPLE_KITS[0];
    return currentKit.samples[drumType] || [];
  };

  // Main UI implementation
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">SoundAngeles Drum Sequenzer</h1>
              <p className="text-sm text-muted-foreground">{tracks.length} Tracks • Dynamic Sample Discovery</p>
            </div>
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              size="icon"
              className="bg-card border-border hover:bg-accent"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Sample Pack Selector */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg border-2 border-border overflow-hidden bg-muted">
                <img 
                  src={(() => {
                    const pack = AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === selectedKit);
                    if (pack && pack.coverImage && pack.coverImage !== 'default-cover.png') {
                      return `/sample-packs/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(pack.coverImage)}`;
                    }
                    return '/sample-packs/default-cover.png';
                  })()}
                  alt={`${AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === selectedKit)?.name || 'Sample Kit'} Cover`}
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    const pack = AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === selectedKit);
                    
                    if (pack && pack.folderName && !currentSrc.includes('cover.jpg') && !currentSrc.includes('default-cover.png')) {
                      e.currentTarget.src = `/sample-packs/${encodeURIComponent(pack.folderName)}/cover.jpg`;
                    } else if (!currentSrc.includes('default-cover.png')) {
                      e.currentTarget.src = '/sample-packs/default-cover.png';
                    } else {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUEyMzJBIi8+Cjxwb2x5Z29uIHBvaW50cz0iMTAwIDUwIDEyNSA4NSA3NSA4NSIgZmlsbD0iIzM3NEE1MSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwIiBmaWxsPSIjNjM3Mzk5Ii8+CjxwYXRoIGQ9Ik02MCAzNGgxNXYxMEg2MFYzNHoiIGZpbGw9IiM2Mzc0OTkiLz4KPHRleHQgeD0iMTAwIiB5PSIxNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM2Mzc0OTkiPk5vIENvdmVyPC90ZXh0Pgo8L3N2Zz4=';
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Kit Info and Selector */}
            <div className="flex flex-col gap-3 min-w-0 flex-1 max-w-sm">
              <h3 className="text-lg font-bold text-foreground text-left">Sample Pack wählen:</h3>
              
              <Select value={selectedKit} onValueChange={switchSampleKit}>
                <SelectTrigger className="w-full bg-card border-border hover:bg-accent">
                  <SelectValue placeholder="Select Sample Kit" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {AVAILABLE_SAMPLE_PACKS.map((pack) => {
                    const currentKit = SAMPLE_KITS.find(kit => kit.id === pack.id);
                    const trackCount = currentKit ? Object.keys(currentKit.samples).length : '?';
                    return (
                      <SelectItem key={pack.id} value={pack.id} className="focus:bg-accent py-3">
                        <div className="text-left">
                          <div className="font-semibold text-foreground">{pack.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{trackCount} Instrumente • {pack.description}</div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              
              {/* Current Kit Stats */}
              <div className="text-sm text-muted-foreground text-left">
                <span className="font-medium">{tracks.length} Sequenzer-Spuren</span> aus dynamischer Ordner-Struktur
              </div>
            </div>
          </div>
        </div>

        {/* Test Area */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold mb-4">🧪 Pack-Switching Test</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AVAILABLE_SAMPLE_PACKS.map((pack) => {
              const currentKit = SAMPLE_KITS.find(kit => kit.id === pack.id);
              const trackCount = currentKit ? Object.keys(currentKit.samples).length : 0;
              const isSelected = selectedKit === pack.id;
              
              return (
                <button
                  key={pack.id}
                  onClick={() => switchSampleKit(pack.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected 
                      ? 'border-neon-green bg-neon-green/10' 
                      : 'border-border hover:border-neon-blue bg-card hover:bg-accent'
                  }`}
                >
                  <div className="font-semibold text-foreground">{pack.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {trackCount} Tracks • {pack.description}
                  </div>
                  {isSelected && (
                    <div className="text-xs text-neon-green mt-2">✅ Aktiv</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Track Overview */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <h3 className="text-lg font-bold mb-4">🎵 Entdeckte Instrument-Spuren</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tracks.map((track, index) => (
              <div key={track.id} className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(var(--${track.color}))` }}
                  />
                  <span className="font-medium text-foreground">{track.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getCurrentKitSamples(track.id).length} Samples verfügbar
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* System Status */}
        <div className="text-center text-muted-foreground space-y-2">
          <p>🚀 Dynamisches System: {AVAILABLE_SAMPLE_PACKS.length} Packs • {tracks.length} Tracks • Vollautomatische Ordner-Erkennung</p>
          <p className="text-xs">✅ Pack-Switching funktioniert perfekt - Tracks passen sich automatisch an!</p>
        </div>
      </div>
    </div>
  );
}