import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sampleResolutionService, type DrumSample as ServiceDrumSample, type PackStructure } from '@/services/SampleResolutionService';

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

// **OPTIMIZED DYNAMIC SYSTEM**
let AVAILABLE_SAMPLE_PACKS: any[] = [];
let SAMPLE_KITS: SampleKit[] = [];

// Farbpalette für unbegrenzte Instrument-Anzahl
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

// **SMART TRACK ID GENERATION**
const getTrackIdFromFolder = (folderName: string): string => {
  return folderName
    .replace(/[\s-&]/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

// **PRESERVE ORIGINAL DISPLAY NAMES**
const getDisplayNameFromFolder = (folderName: string): string => {
  return folderName;
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
  
  if (name.includes('kick') || name.includes('bass')) return 60;
  if (name.includes('snare')) return 200;
  if (name.includes('hi') && name.includes('hat')) {
    return name.includes('open') ? 6000 : 8000;
  }
  if (name.includes('tom')) return 120;
  if (name.includes('perc') || name.includes('clap') || name.includes('hand')) return 1000;
  if (name.includes('crash') || name.includes('ride')) return 4000;
  if (name.includes('rim')) return 300;
  if (name.includes('snap') || name.includes('finger')) return 2000;
  
  return 440;
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

// **PACK-AGNOSTIC DYNAMIC TRACK GENERATION**
const generateDynamicTracks = async (selectedPackId?: string): Promise<DrumTrack[]> => {
  if (AVAILABLE_SAMPLE_PACKS.length === 0) {
    await initializeSampleKits();
  }
  
  const packId = selectedPackId || AVAILABLE_SAMPLE_PACKS[0]?.id;
  if (!packId) return [];
  
  console.log(`🏗️ Generating tracks for pack: ${packId}`);
  
  try {
    // Use service instead of hardcoded SAMPLE_KITS
    const packStructure = await sampleResolutionService.discoverPackStructure(packId);
    const trackIds = Object.keys(packStructure.tracks);
    
    console.log(`📊 Found ${trackIds.length} tracks in pack`);
    
    // **SMART SORTING - NUMERIC PREFIXES FIRST, THEN ALPHABETICAL**
    const sortedTrackIds = trackIds.sort((a, b) => {
      const aTrack = packStructure.tracks[a];
      const bTrack = packStructure.tracks[b];
      
      const aMatch = aTrack.name.match(/^(\d+)/);
      const bMatch = bTrack.name.match(/^(\d+)/);
      
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      } else if (aMatch) {
        return -1;
      } else if (bMatch) {
        return 1;
      } else {
        return aTrack.name.localeCompare(bTrack.name);
      }
    });
    
    const tracks: DrumTrack[] = [];
    
    for (let index = 0; index < sortedTrackIds.length; index++) {
      const trackId = sortedTrackIds[index];
      const trackData = packStructure.tracks[trackId];
      
      if (trackData.samples.length === 0) {
        console.warn(`⚠️ No samples found for track: ${trackId}`);
        continue;
      }
      
      const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
      
      tracks.push({
        id: trackId,
        name: trackData.displayName,
        color: color,
        steps: new Array(16).fill(false),
        volume: 0.7,
        selectedSampleId: trackData.samples[0].id
      });
      
      console.log(`✅ Track ${index + 1}: ${trackData.displayName} (${trackData.samples.length} samples)`);
    }
    
    console.log(`🎵 Generated ${tracks.length} tracks successfully`);
    return tracks;
  } catch (error) {
    console.error(`❌ Error generating tracks for pack ${packId}:`, error);
    return [];
  }
};

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
  
  // CRITICAL: Add missing step execution method
  playStep(stepIndex: number, playFunction: (trackIndex: number, volume: number, sampleId: string) => void) {
    // FIXED: Remove wrong guard clause - playStep should always execute when called
    const activeTrackIndexes = this.getActiveTracksForStep(stepIndex);
    activeTrackIndexes.forEach(trackIndex => {
      const volume = this.getVolume(trackIndex);
      const sampleId = this.getSelectedSample(trackIndex);
      playFunction(trackIndex, volume, sampleId);
    });
  }
}

// **MAIN COMPONENT**
export default function DrumSequencerFinal() {
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
  const preloadedSamplesRef = useRef<Set<string>>(new Set());
  const criticalSamplesLoadedRef = useRef<boolean>(false);

  let INITIAL_TRACKS: DrumTrack[] = [];

  const audioEngineRef = useRef<SequencerAudioEngine>(new SequencerAudioEngine());

  // **INITIALIZATION**
  useEffect(() => {
    const initializeTracks = async () => {
      console.log('🚀 INITIALIZATION STARTED - Service-based approach');
      
      // **SIMPLIFIED: ONLY DISCOVER PACKS - NO OLD SAMPLE_KITS LOADING**
      await discoverSamplePacks();
      console.log(`📦 Discovered ${AVAILABLE_SAMPLE_PACKS.length} sample packs`);
      
      let packToLoad = selectedKit;
      if (AVAILABLE_SAMPLE_PACKS.length > 0) {
        if (!packToLoad || !AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === packToLoad)) {
          packToLoad = AVAILABLE_SAMPLE_PACKS[0].id;
          setSelectedKit(packToLoad);
        }
        console.log(`🎯 Selected pack: ${packToLoad}`);
      }
      
      const dynamicTracks = await generateDynamicTracks(packToLoad);
      console.log(`🎵 Generated ${dynamicTracks.length} dynamic tracks`);
      
      INITIAL_TRACKS = dynamicTracks;
      setTracks(dynamicTracks);
      
      audioEngineRef.current.initializeTracks(dynamicTracks);
      setIsInitialized(true);
      console.log('✅ Audio engine initialized with tracks');
      
      await aggressivePreloadDefaultSamples(dynamicTracks, packToLoad);
    };
    
    initializeTracks();
  }, []);

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

  // **SERVICE-BASED PRELOADING - NO MORE SAMPLE_KITS DEPENDENCY**
  const aggressivePreloadDefaultSamples = async (tracks: DrumTrack[], kitId: string) => {
    console.log(`🚀 Starting service-based preloading for kit: ${kitId}`);
    
    const defaultSamples: { track: DrumTrack; sample: ServiceDrumSample }[] = [];
    
    // Use service to resolve default samples for each track
    for (const track of tracks) {
      try {
        const serviceSample = await sampleResolutionService.resolveSampleForTrack(kitId, track.id, track.selectedSampleId);
        if (serviceSample && serviceSample.sampleType === 'audio' && serviceSample.audioFile) {
          defaultSamples.push({ track, sample: serviceSample });
          console.log(`✅ Found sample for track ${track.id}: ${serviceSample.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not resolve sample for track ${track.id}:`, error);
      }
    }
    
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
        // Silent fail
      }
    });
    
    await Promise.all(loadPromises);
    
    criticalSamplesLoadedRef.current = true;
    setIsPreloadingComplete(true);
    
    console.log(`🎯 Preloading complete: ${loadedCount}/${defaultSamples.length} samples loaded`);
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

  // **LEGACY FUNCTIONS REMOVED - NOW USING SERVICE-BASED APPROACH**

  // **PACK-AGNOSTIC SAMPLE PROVIDER**
  const [trackSamples, setTrackSamples] = useState<{[trackId: string]: DrumSample[]}>({});
  
  const getCurrentKitSamples = (trackId: string): DrumSample[] => {
    return trackSamples[trackId] || [];
  };

  // **CONVERT SERVICE SAMPLE TO COMPONENT SAMPLE**
  const convertServiceSample = (serviceSample: ServiceDrumSample): DrumSample => {
    return {
      id: serviceSample.id,
      name: serviceSample.name,
      audioFile: serviceSample.audioFile || '',
      sampleType: 'audio'
    };
  };

  // Keep tracksRef in sync
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // **PACK-AGNOSTIC SAMPLE LOADING**
  useEffect(() => {
    const loadSamplesForAllTracks = async () => {
      if (!selectedKit || tracks.length === 0) return;
      
      console.log(`🔄 Loading samples for ${tracks.length} tracks in pack: ${selectedKit}`);
      
      try {
        const samplePromises = tracks.map(async (track) => {
          const samples = await sampleResolutionService.getSamplesForTrack(selectedKit, track.id);
          return { trackId: track.id, samples };
        });
        
        const results = await Promise.all(samplePromises);
        const newTrackSamples: {[trackId: string]: DrumSample[]} = {};
        
        results.forEach(({trackId, samples}) => {
          newTrackSamples[trackId] = samples.map(convertServiceSample);
          console.log(`✅ Loaded ${samples.length} samples for track: ${trackId}`);
        });
        
        setTrackSamples(newTrackSamples);
        console.log(`🎵 Sample loading complete for pack: ${selectedKit}`);
      } catch (error) {
        console.error(`❌ Error loading samples for pack ${selectedKit}:`, error);
      }
    };
    
    loadSamplesForAllTracks();
  }, [selectedKit, tracks.length]);

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

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Update BPM refs when BPM changes
  useEffect(() => {
    bpmRef.current = bpm;
    stepDurationRef.current = (60 / bpm / 4);
  }, [bpm]);

  // **CRITICAL FIX: Stable scheduler callback defined OUTSIDE useEffect**
  const runScheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current || isSchedulingRef.current) return;
    
    isSchedulingRef.current = true;
    const ctx = audioContextRef.current;
    
    // Get current step duration from ref
    const stepDuration = stepDurationRef.current || (60 / 120 / 4); // fallback to 120 BPM
    
    // **LOOKAHEAD SCHEDULING - Schedule all events within window**
    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      // **SCHEDULE AUDIO EVENTS USING SCHEDULE STEP FUNCTION**
      scheduleStep(nextStepTimeRef.current, currentStepIndexRef.current);
      
      // **SYNC AUDIO ENGINE STEP**
      audioEngineRef.current.setCurrentStep(currentStepIndexRef.current);
      
      // **ADVANCE TO NEXT STEP**
      nextStepTimeRef.current += stepDuration;
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
    
    isSchedulingRef.current = false;
  }, []); // NO DEPENDENCIES - uses only refs!

  // **PACK-AGNOSTIC PLAY DRUM SOUND**
  const playDrumSound = useCallback(async (track: DrumTrack, scheduledTime?: number, manualTrigger = true) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const startTime = scheduledTime || ctx.currentTime;
    
    try {
      // Use service to resolve sample - NO MORE HARDCODED SAMPLE_KITS
      const serviceSample = await sampleResolutionService.resolveSampleForTrack(selectedKit, track.id, track.selectedSampleId);
      
      if (!serviceSample) {
        console.warn(`No sound found for track ${track.id} with sample ${track.selectedSampleId}`);
        return;
      }

      // Convert to component format
      const sound = convertServiceSample(serviceSample);
      console.log(`🎵 Playing: ${track.name} -> ${sound.name} (${sound.sampleType})`);
      
      // ONLY REAL SAMPLES - NO SYNTHESIZED SOUNDS
      let audioBuffer = sampleCacheRef.current[sound.audioFile];
      
      if (audioBuffer) {
        playAudioBuffer(audioBuffer, track, startTime);
        console.log(`✅ Playing cached sample: ${track.name} - ${sound.name}`);
      } else {
        console.log(`🔄 Loading sample: ${track.name} - ${sound.name}`);
        try {
          const emergencyBuffer = await loadAudioSample(sound.audioFile, 'high');
          if (emergencyBuffer) {
            playAudioBuffer(emergencyBuffer, track, startTime);
            console.log(`✅ Playing loaded sample: ${track.name} - ${sound.name}`);
          } else {
            console.error(`❌ Failed to load sample: ${sound.audioFile}`);
          }
        } catch (error) {
          console.error(`❌ Error loading sample:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error resolving sample for track ${track.id}:`, error);
      return;
    }
  }, [selectedKit]);

  // **AUDIO BUFFER PLAYBACK - GUARANTEED FULL-LENGTH SAMPLE PLAYBACK**
  const playAudioBuffer = useCallback((audioBuffer: AudioBuffer, track: DrumTrack, startTime: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    gainNode.gain.setValueAtTime(track.volume, startTime);
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    audioSourcesRef.current.push(source);
    
    source.onended = () => {
      const index = audioSourcesRef.current.indexOf(source);
      if (index > -1) {
        audioSourcesRef.current.splice(index, 1);
      }
    };
    
    source.start(startTime);
    console.log(`🎵 SAMPLE PLAYBACK: ${audioBuffer.duration.toFixed(3)}s duration`);
  }, []);


  // **CRITICAL: MISSING SCHEDULE STEP FUNCTION - CORE AUDIO SCHEDULER**
  const scheduleStep = useCallback((time: number, stepIndex: number) => {
    // **CRITICAL: SCHEDULER READS ONLY FROM AUDIO ENGINE - NOT REACT STATE**
    const activeTrackIndexes = audioEngineRef.current.getActiveTracksForStep(stepIndex);
    const trackIds = audioEngineRef.current.getTrackIds();
    
    activeTrackIndexes.forEach((trackIndex) => {
      const trackId = trackIds[trackIndex];
      const volume = audioEngineRef.current.getVolume(trackIndex);
      const selectedSampleId = audioEngineRef.current.getSelectedSample(trackIndex);
      
      // **CREATE AUDIO-ENGINE TRACK OBJECT FOR PLAYBACK**
      const audioTrack: DrumTrack = {
        id: trackId,
        name: tracksRef.current[trackIndex]?.name || trackId,
        color: tracksRef.current[trackIndex]?.color || 'neon-blue',
        steps: audioEngineRef.current.getPattern(trackIndex),
        volume: volume,
        selectedSampleId: selectedSampleId
      };
      
      // **SCHEDULE AT PRECISE WEB AUDIO TIMELINE - ISOLATED FROM REACT**
      playDrumSound(audioTrack, time, false);
    });
  }, []); // NO DEPENDENCIES!

  // **STABLE VISUAL UPDATE CALLBACK**
  const updateVisuals = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const timeSinceLastStep = (ctx.currentTime - (nextStepTimeRef.current - stepDurationRef.current));
    const progress = timeSinceLastStep / stepDurationRef.current;
    
    // Always update visual step
    setCurrentStep(currentStepIndexRef.current);
    
    timerWorkerRef.current = requestAnimationFrame(updateVisuals);
  }, []); // NO DEPENDENCIES!

  // **PROFESSIONAL WEB AUDIO SCHEDULER - PRECISION TIMING SYSTEM**
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      const ctx = audioContextRef.current;
      
      // **INITIALIZE PRECISE TIMING**
      if (nextStepTimeRef.current === 0) {
        nextStepTimeRef.current = ctx.currentTime + 0.005; // 5ms initial delay for stability
        currentStepIndexRef.current = 0;
        // Initialize step duration here as well
        stepDurationRef.current = (60 / bpm / 4);
      }
      
      // **START SCHEDULER WITH STABLE CALLBACK**
      schedulerIntervalRef.current = setInterval(runScheduler, lookAheadTime);
      
      // **START VISUAL UPDATES**
      updateVisuals();
      
    } else {
      // **CLEAN SHUTDOWN**
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      if (timerWorkerRef.current) {
        cancelAnimationFrame(timerWorkerRef.current);
        timerWorkerRef.current = 0;
      }
      
      // Reset timing state
      nextStepTimeRef.current = 0;
      currentStepIndexRef.current = 0;
      isSchedulingRef.current = false;
    }

    // **CLEANUP FUNCTION**
    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
      if (timerWorkerRef.current) {
        cancelAnimationFrame(timerWorkerRef.current);
      }
    };
  }, [isPlaying]); // ONLY isPlaying dependency - runScheduler/updateVisuals are stable!

  // **DUAL-STATE PATTERN UPDATE**
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    if (!isPreloadingComplete) return;
    
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentValue = audioEngineRef.current.getPattern(trackIndex)[stepIndex];
    const newValue = !currentValue;
    
    // Immediate audio engine update
    audioEngineRef.current.updatePattern(trackIndex, stepIndex, newValue);
    
    // Async React state update
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, steps: track.steps.map((step, idx) => idx === stepIndex ? newValue : step) }
        : track
    ));
  }, [isPreloadingComplete]);

  // **DUAL-STATE PLAYBACK CONTROL**
  const togglePlayback = useCallback(() => {
    if (!isPreloadingComplete) return;
    
    const newPlayState = !isPlaying;
    
    audioEngineRef.current.setPlaying(newPlayState);
    if (newPlayState) {
      audioEngineRef.current.setCurrentStep(0);
    }
    
    if (newPlayState && !isPlaying) {
      nextStepTimeRef.current = 0;
      currentStepIndexRef.current = 0;
      setCurrentStep(0);
    }
    
    setIsPlaying(newPlayState);
  }, [isPlaying, isPreloadingComplete]);

  const stopPlayback = useCallback(() => {
    audioEngineRef.current.setPlaying(false);
    audioEngineRef.current.setCurrentStep(0);
    
    setIsPlaying(false);
    setCurrentStep(0);
    
    // Stop all audio sources
    activeOscillatorsRef.current.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (e) {
        // Already stopped
      }
    });
    activeOscillatorsRef.current = [];
    
    audioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    audioSourcesRef.current = [];
    
    nextStepTimeRef.current = 0;
    setAudioLevels({});
  }, []);

  const clearPattern = useCallback(() => {
    audioEngineRef.current.clearAllPatterns();
    setTracks(prev => prev.map(track => ({ ...track, steps: new Array(16).fill(false) })));
    setCurrentStep(0);
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const normalizedVolume = volume / 100;
    
    audioEngineRef.current.updateVolume(trackIndex, normalizedVolume);
    
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume: normalizedVolume } : track
    ));
  }, []);

  const updateTrackSample = useCallback((trackId: string, sampleId: string) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    audioEngineRef.current.updateSelectedSample(trackIndex, sampleId);
    
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, selectedSampleId: sampleId } : track
    ));
  }, []);

  const updateBpm = (newBpm: number) => {
    audioEngineRef.current.setBpm(newBpm);
    setBpm(newBpm);
  };

  // Loading states
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

  // Main UI
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

        {/* Transport Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 p-4 sm:p-6 bg-card rounded-xl border border-border">
          <Button
            onClick={togglePlayback}
            className={`control-button ${isPlaying ? 'active' : ''} ${!isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={!isPreloadingComplete}
          >
            {isPlaying ? <Pause className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" /> : <Play className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" />}
            <span className="hidden sm:inline">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            <span className="sm:hidden">{isPlaying ? 'II' : '▶'}</span>
          </Button>
          
          <Button
            onClick={stopPlayback}
            className={`control-button stop ${!isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={!isPreloadingComplete}
          >
            <Square className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">STOP</span>
            <span className="sm:hidden">■</span>
          </Button>
          
          <Button
            onClick={clearPattern}
            className={`control-button ${!isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={!isPreloadingComplete}
          >
            <RotateCcw className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">CLEAR</span>
            <span className="sm:hidden">↻</span>
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
            <span className="text-foreground font-semibold text-sm sm:text-base">BPM</span>
            <div className="w-20 sm:w-32">
              <Slider
                value={[bpm]}
                onValueChange={(value) => updateBpm(value[0])}
                min={60}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
            <span className="bpm-display min-w-[40px] sm:min-w-[60px] text-center">{bpm}</span>
          </div>
        </div>

        {/* Step Indicators with 4/4 Beat Grid */}
        <div className="flex justify-center overflow-x-auto">
          <div className="flex gap-2 sm:gap-4 min-w-max">
            {Array.from({ length: 4 }, (_, beat) => (
              <div key={beat} className="relative">
                <div className="text-xs text-muted-foreground text-center mb-2 font-bold">
                  {beat + 1}
                </div>
                <div className="flex gap-0.5 sm:gap-1">
                  {Array.from({ length: 4 }, (_, step) => {
                    const stepIndex = beat * 4 + step;
                    return (
                      <div
                        key={stepIndex}
                        className={`w-6 sm:w-8 h-2 sm:h-3 rounded ${
                          stepIndex === currentStep && isPlaying
                            ? 'bg-neon-green shadow-[0_0_10px_hsl(var(--neon-green))]'
                            : step === 0 
                            ? 'bg-neon-blue/30 border border-neon-blue/50' 
                            : 'bg-border'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sequencer Grid */}
        <div className="space-y-6">
          {tracks.map((track) => (
            <div key={track.id} className="track-container">
              {/* Track Info Row - Mobile Only */}
              <div className="track-info-row-mobile sm:hidden flex flex-col gap-3 items-center">
                <div className="track-label-new" style={{ color: `hsl(var(--${track.color}))` }}>
                  {track.name}
                </div>
                
                <div className="flex gap-4 items-center w-full justify-center flex-wrap">
                  <div className="sample-selector-container min-w-[180px]">
                    <Select 
                      value={track.selectedSampleId} 
                      onValueChange={(value) => updateTrackSample(track.id, value)}
                    >
                      <SelectTrigger className="sample-selector-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border max-h-48">
                        {getCurrentKitSamples(track.id).map((sample) => (
                          <SelectItem key={sample.id} value={sample.id} className="text-sm focus:bg-accent py-2">
                            {sample.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="volume-control-container">
                    <label className="volume-label">VOL</label>
                    <Slider
                      value={[track.volume * 100]}
                      onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-32"
                    />
                    <span className="volume-value">{Math.round(track.volume * 100)}</span>
                  </div>
                </div>
              </div>

              {/* Track Info Row - Desktop/Tablet Only */}
              <div className="track-info-row">
                {/* Track Label - Left Centered */}
                <div className="track-label-new" style={{ color: `hsl(var(--${track.color}))` }}>
                  {track.name}
                </div>
                
                {/* Sample Selector - Middle Centered */}
                <div className="sample-selector-container">
                  <Select 
                    value={track.selectedSampleId} 
                    onValueChange={(value) => updateTrackSample(track.id, value)}
                  >
                    <SelectTrigger className="sample-selector-trigger max-w-[250px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-48">
                      {getCurrentKitSamples(track.id).map((sample) => (
                        <SelectItem key={sample.id} value={sample.id} className="text-sm focus:bg-accent py-2">
                          {sample.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Volume Control - Right Centered */}
                <div className="volume-control-container">
                  <label className="volume-label">VOL</label>
                  <Slider
                    value={[track.volume * 100]}
                    onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="volume-slider-new"
                  />
                  <span className="volume-value">{Math.round(track.volume * 100)}</span>
                </div>
              </div>
              
              {/* Step Sequencer Row */}
              <div className="step-sequencer-row">
                {/* Desktop + Tablet: 4x4 Layout */}
                <div className="hidden sm:flex gap-4">
                  {Array.from({ length: 4 }, (_, beat) => (
                    <div key={beat} className="beat-group">
                      {Array.from({ length: 4 }, (_, step) => {
                        const stepIndex = beat * 4 + step;
                        const isActive = track.steps[stepIndex];
                        return (
                          <button
                            key={stepIndex}
                            onClick={() => toggleStep(track.id, stepIndex)}
                            className={`step-button-new ${isActive ? 'active' : ''} ${
                              stepIndex === currentStep && isPlaying ? 'playing' : ''
                            } ${step === 0 ? 'beat-start' : ''}`}
                            style={{
                              borderColor: isActive ? `hsl(var(--${track.color}))` : undefined,
                              backgroundColor: isActive ? `hsl(var(--${track.color}) / 0.8)` : undefined,
                              boxShadow: isActive && stepIndex === currentStep && isPlaying 
                                ? `0 0 12px hsl(var(--${track.color}) / 0.4)` 
                                : undefined
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                
                {/* Mobile Only: 2x8 Layout */}
                <div className="sm:hidden flex flex-col gap-2">
                  {/* First Row: Steps 1-8 */}
                  <div className="beat-group mobile-row">
                    {Array.from({ length: 8 }, (_, step) => {
                      const stepIndex = step;
                      const isActive = track.steps[stepIndex];
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`step-button-new ${isActive ? 'active' : ''} ${
                            stepIndex === currentStep && isPlaying ? 'playing' : ''
                          } ${step === 0 || step === 4 ? 'beat-start' : ''} ${
                            !isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!isPreloadingComplete}
                          style={{
                            borderColor: isActive ? `hsl(var(--${track.color}))` : undefined,
                            backgroundColor: isActive ? `hsl(var(--${track.color}) / 0.8)` : undefined,
                            boxShadow: isActive && stepIndex === currentStep && isPlaying 
                              ? `0 0 12px hsl(var(--${track.color}) / 0.4)` 
                              : undefined
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Second Row: Steps 9-16 */}
                  <div className="beat-group mobile-row">
                    {Array.from({ length: 8 }, (_, step) => {
                      const stepIndex = step + 8;
                      const isActive = track.steps[stepIndex];
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`step-button-new ${isActive ? 'active' : ''} ${
                            stepIndex === currentStep && isPlaying ? 'playing' : ''
                          } ${step === 0 || step === 4 ? 'beat-start' : ''} ${
                            !isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={!isPreloadingComplete}
                          style={{
                            borderColor: isActive ? `hsl(var(--${track.color}))` : undefined,
                            backgroundColor: isActive ? `hsl(var(--${track.color}) / 0.8)` : undefined,
                            boxShadow: isActive && stepIndex === currentStep && isPlaying 
                              ? `0 0 12px hsl(var(--${track.color}) / 0.4)` 
                              : undefined
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground space-y-2">
          <p>Klicke auf das Grid um deine Beats zu programmieren • Nutze die Transport-Controls zum Abspielen</p>
          <p className="text-xs">🚀 Dynamisches System: {AVAILABLE_SAMPLE_PACKS.length} Packs • {tracks.length} Tracks • Pack-Switching über Dropdown</p>
        </div>
      </div>
    </div>
  );
}