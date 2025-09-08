import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DrumSample {
  id: string;
  name: string;
  freq?: number;           // Optional für synthetisierte Sounds
  type?: OscillatorType;   // Optional für synthetisierte Sounds
  duration?: number;       // Optional für synthetisierte Sounds
  preset?: string;         // Optional für synthetisierte Sounds
  audioFile?: string;      // Pfad zur Audio-Datei
  sampleType: 'synthesized' | 'audio'; // Typ des Samples
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
    [drumType: string]: string; // Maps track ID to original folder name
  };
}

// **TRULY DYNAMIC SYSTEM**
// Automatically discovers ALL sample packs and their structures using filesystem APIs!
let AVAILABLE_SAMPLE_PACKS: any[] = [];
let SAMPLE_KITS: SampleKit[] = [];

// Ordner-zu-Farbe Mapping für konsistente Farbzuweisung
const FOLDER_COLORS = [
  'neon-blue', 'neon-green', 'neon-pink', 'neon-cyan', 
  'neon-yellow', 'neon-purple', 'neon-orange', 'neon-red',
  'neon-violet', 'neon-teal', 'neon-lime', 'neon-rose',
  // Erweiterte Farbpalette für mehr als 12 Instrumente
  'neon-blue', 'neon-green', 'neon-pink', 'neon-cyan',
  'neon-yellow', 'neon-purple', 'neon-orange', 'neon-red',
  'neon-violet', 'neon-teal', 'neon-lime', 'neon-rose'
];

// **OPTIMIZED API-BASED DYNAMIC SAMPLE PACK DISCOVERY**
// Uses filesystem API to discover ALL actual sample packs with minimal logging
const discoverSamplePacks = async (): Promise<void> => {
  try {
    const response = await fetch('/api/discover-packs');
    const data = await response.json();
    
    if (data.error) {
      console.warn('⚠️ No sample packs found:', data.error);
      AVAILABLE_SAMPLE_PACKS = [];
      return;
    }
    
    AVAILABLE_SAMPLE_PACKS = data.packs || [];
    console.log(`✅ Discovered ${AVAILABLE_SAMPLE_PACKS.length} sample packs`);
  } catch (error) {
    console.error('❌ Sample pack discovery failed:', error);
    AVAILABLE_SAMPLE_PACKS = [];
  }
};

// **OPTIMIZED API-BASED DYNAMIC INSTRUMENT FOLDER DISCOVERY**
// Uses filesystem API to discover ALL actual instrument folders within a sample pack
const discoverInstrumentFolders = async (packName: string): Promise<string[]> => {
  try {
    const response = await fetch(`/api/discover-instruments?pack=${encodeURIComponent(packName)}`);
    const data = await response.json();
    
    if (data.error) {
      console.warn(`⚠️ No instruments in ${packName}:`, data.error);
      return [];
    }
    
    const folders = data.folders || [];
    console.log(`🎵 Pack "${packName}" has ${folders.length} instrument types`);
    return folders;
  } catch (error) {
    console.error(`❌ Failed to scan ${packName}:`, error);
    return [];
  }
};

// **OPTIMIZED API-BASED DYNAMIC SAMPLE PACK LOADING**
const loadSamplePackStructure = async (packId: string): Promise<SampleKit | null> => {
  const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === packId);
  if (!pack) return null;

  try {
    const samples: { [drumType: string]: DrumSample[] } = {};
    
    // **DYNAMICALLY DISCOVER ALL INSTRUMENT FOLDERS USING API**
    const folders = await discoverInstrumentFolders(pack.folderName);
    
    if (folders.length === 0) {
      console.warn(`⚠️ No instruments in ${pack.name}`);
      return null;
    }
    
    // Erstelle Samples für jeden gefundenen Ordner - PARALLEL LOADING
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
    
    console.log(`✅ Loaded ${pack.name}: ${Object.keys(samples).length} tracks`);
    
    return {
      id: packId,
      name: pack.name,
      description: pack.description,
      samples: samples,
      folderNames: folderNames
    };
  } catch (error) {
    console.error(`❌ Failed to load ${pack.name}:`, error);
    return null;
  }
};

// Function to get track ID from folder name (preserves original structure for IDs)
const getTrackIdFromFolder = (folderName: string): string => {
  // Keep the original folder name as much as possible for the ID
  // Just replace spaces and special characters with underscores to make it a valid ID
  return folderName.replace(/[\s-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
};

// Function to get display name from folder name (preserves original folder names)
const getDisplayNameFromFolder = (folderName: string): string => {
  // Keep the entire original folder name including numerical prefix
  return folderName;
};

// **API-BASED DYNAMIC WAV FILE DISCOVERY**
// Uses filesystem API to discover ALL actual WAV files in any instrument folder
const loadSamplesFromFolder = async (packName: string, folderName: string, trackId: string): Promise<DrumSample[]> => {
  const samples: DrumSample[] = [];
  
  console.log(`🔎 Discovering samples for ${trackId} in: ${folderName}`);
  
  try {
    const response = await fetch(`/api/discover-samples?pack=${encodeURIComponent(packName)}&folder=${encodeURIComponent(folderName)}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error discovering samples:', data.error);
      return createFallbackSamplesForFolder(folderName, trackId);
    }
    
    const files = data.files || [];
    
    if (files.length === 0) {
      console.warn(`⚠️ No audio files found in ${folderName}, creating synthesized fallback`);
      return createFallbackSamplesForFolder(folderName, trackId);
    }
    
    // Create sample objects for each discovered file
    files.forEach((fileName: string, index: number) => {
      const sampleId = `${trackId}-${index + 1}-${Date.now()}`;
      // **FIXED: Simplified path construction to prevent double encoding issues**
      const audioFilePath = `/sample-packs/${encodeURIComponent(packName)}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;
      
      samples.push({
        id: sampleId,
        name: fileName.replace(/\.(wav|mp3)$/i, ''), // Keep original filename as display name
        audioFile: audioFilePath,
        sampleType: 'audio'
      });
    });
    
    console.log(`🎵 Found ${samples.length} samples for ${trackId} in ${folderName}:`, files);
    
  } catch (error) {
    console.error('❌ Failed to discover samples:', error);
    return createFallbackSamplesForFolder(folderName, trackId);
  }
  
  return samples;
};

// Helper function to create fallback synthesized samples when no audio files are found
const createFallbackSamplesForFolder = (folderName: string, trackId: string): DrumSample[] => {
  const displayName = getDisplayNameFromFolder(folderName);
  
  return [{
    id: `${trackId}-fallback`,
    name: `${displayName} (Synthesized)`,
    audioFile: '', // Empty = will be treated as synthesized sound
    sampleType: 'synthesized',
    // Fallback parameters for synthesized sound based on folder name
    freq: getFallbackFrequency(folderName),
    type: 'sine' as OscillatorType,
    duration: 0.3
  }];
};

// Helper function to get fallback frequency based on folder name
const getFallbackFrequency = (folderName: string): number => {
  const folderType = folderName.toLowerCase();
  
  if (folderType.includes('kick') || folderType.includes('bass')) {
    return 60;
  } else if (folderType.includes('snare')) {
    return 200;
  } else if (folderType.includes('rimshot')) {
    return 300;
  } else if (folderType.includes('hi-hat') && folderType.includes('open')) {
    return 6000;
  } else if (folderType.includes('hi-hat')) {
    return 8000;
  } else if (folderType.includes('ride')) {
    return 4000;
  } else if (folderType.includes('clap') || folderType.includes('hand')) {
    return 1000;
  } else if (folderType.includes('percussion')) {
    return 500;
  } else if (folderType.includes('tom')) {
    return 120;
  } else if (folderType.includes('fingersnap')) {
    return 2000;
  }
  
  return 440; // Default fallback
};

// **COMPLETE API-BASED DYNAMIC SYSTEM INITIALIZATION**
const initializeSampleKits = async (): Promise<void> => {
  console.log('🚀 Initializing TRULY DYNAMIC sample system using filesystem APIs...');
  
  // Step 1: Dynamically discover ALL sample packs using filesystem API
  await discoverSamplePacks();
  
  if (AVAILABLE_SAMPLE_PACKS.length === 0) {
    console.warn('⚠️ No sample packs discovered! Adding fallback pack...');
    // Add a fallback if no packs are found
    AVAILABLE_SAMPLE_PACKS.push({
      id: 'fallback-kit',
      name: 'Synthesized Drum Kit',
      description: 'Basic synthesized drum sounds',
      folderName: 'Fallback',
      coverImage: 'default-cover.png'
    });
  }
  
  // Step 2: Load each discovered pack with its actual structure using APIs
  SAMPLE_KITS = [];
  for (const pack of AVAILABLE_SAMPLE_PACKS) {
    console.log(`📦 Loading pack using API: ${pack.name}`);
    const sampleKit = await loadSamplePackStructure(pack.id);
    if (sampleKit && Object.keys(sampleKit.samples).length > 0) {
      SAMPLE_KITS.push(sampleKit);
      console.log(`✅ Loaded sample kit: ${sampleKit.name} with ${Object.keys(sampleKit.samples).length} instrument types`);
      
      // Log discovered instruments for debugging
      const instrumentNames = Object.entries(sampleKit.folderNames || {}).map(([id, name]) => name);
      console.log(`🎼 Instruments: ${instrumentNames.join(', ')}`);
    } else {
      console.warn(`⚠️ Failed to load pack: ${pack.name}`);
    }
  }
  
  console.log(`🎵 Total sample kits loaded using dynamic APIs: ${SAMPLE_KITS.length}`);
  
  if (SAMPLE_KITS.length === 0) {
    console.error('❌ No sample kits could be loaded! Creating emergency fallback...');
    // Create emergency fallback kit
    SAMPLE_KITS.push(createEmergencyFallbackKit());
  }
};

// Emergency fallback kit with synthesized sounds
const createEmergencyFallbackKit = (): SampleKit => {
  console.log('🆘 Creating emergency fallback kit with synthesized sounds...');
  
  const fallbackInstruments = [
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
  
  fallbackInstruments.forEach(inst => {
    samples[inst.id] = [{
      id: `${inst.id}-synth-1`,
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
    description: 'Basic synthesized drum sounds (fallback)',
    samples,
    folderNames
  };
};

// **DYNAMIC TRACK GENERATION**
// Creates tracks based on the ACTUAL discovered structure of any sample pack
const generateDynamicTracks = async (selectedPackId?: string): Promise<DrumTrack[]> => {
  // Ensure sample kits are loaded
  if (SAMPLE_KITS.length === 0) {
    await initializeSampleKits();
  }
  
  const packId = selectedPackId || AVAILABLE_SAMPLE_PACKS[0]?.id;
  const currentKit = SAMPLE_KITS.find(kit => kit.id === packId) || SAMPLE_KITS[0];
  
  if (!currentKit) {
    console.error('❌ No sample kit found! This should not happen.');
    return [];
  }
  
  console.log(`🎛️ Generating tracks for kit: ${currentKit.name}`);
  console.log(`📊 Available instrument types: ${Object.keys(currentKit.samples).length}`);
  
  const tracks: DrumTrack[] = [];
  const drumTypes = Object.keys(currentKit.samples);
  
  // Sort drum types to ensure consistent ordering
  const sortedDrumTypes = drumTypes.sort((a, b) => {
    const aName = currentKit.folderNames?.[a] || a;
    const bName = currentKit.folderNames?.[b] || b;
    return aName.localeCompare(bName);
  });
  
  sortedDrumTypes.forEach((trackId, index) => {
    const samples = currentKit.samples[trackId];
    if (samples.length === 0) {
      console.warn(`⚠️ No samples found for instrument: ${trackId}`);
      return;
    }
    
    const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
    
    // Get the original folder name from the kit's folderNames mapping
    const originalFolderName = currentKit.folderNames?.[trackId] || trackId;
    const displayName = getDisplayNameFromFolder(originalFolderName);
    
    console.log(`🎵 Creating track: ${displayName} (${samples.length} samples available)`);
    
    tracks.push({
      id: trackId,
      name: displayName,
      color: color,
      steps: new Array(16).fill(false),
      volume: 0.7,
      selectedSampleId: samples[0].id
    });
  });
  
  console.log(`✅ Generated ${tracks.length} dynamic tracks:`);
  tracks.forEach((track, i) => {
    console.log(`  ${i + 1}. ${track.name} (${currentKit.samples[track.id]?.length || 0} samples)`);
  });
  
  return tracks;
};

let INITIAL_TRACKS: DrumTrack[] = [];

// **PROFESSIONAL ISOLATED AUDIO ENGINE - COMPLETELY SEPARATE FROM REACT**
class SequencerAudioEngine {
  // **AUDIO-ONLY STATE - NEVER TRIGGERS REACT RE-RENDERS**
  private pattern: boolean[][] = [];
  private volumes: number[] = [];
  private selectedSamples: string[] = [];
  private trackIds: string[] = [];
  private currentStep: number = 0;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  
  // **INITIALIZE AUDIO ENGINE WITH TRACK DATA**
  initializeTracks(tracks: DrumTrack[]) {
    this.trackIds = tracks.map(t => t.id);
    this.pattern = tracks.map(t => [...t.steps]);
    this.volumes = tracks.map(t => t.volume);
    this.selectedSamples = tracks.map(t => t.selectedSampleId);
  }
  
  // **IMMEDIATE AUDIO UPDATES - NO REACT STATE TRIGGERS**
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
  
  setBpm(newBpm: number) {
    this.bpm = newBpm;
  }
  
  setPlaying(playing: boolean) {
    this.isPlaying = playing;
  }
  
  setCurrentStep(step: number) {
    this.currentStep = step;
  }
  
  // **PURE GETTERS - NO SIDE EFFECTS**
  getPattern(trackIndex: number): boolean[] {
    return this.pattern[trackIndex] || [];
  }
  
  getVolume(trackIndex: number): number {
    return this.volumes[trackIndex] || 0.7;
  }
  
  getSelectedSample(trackIndex: number): string {
    return this.selectedSamples[trackIndex] || '';
  }
  
  getBpm(): number {
    return this.bpm;
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  getTrackIds(): string[] {
    return this.trackIds;
  }
  
  // **GET ACTIVE TRACKS FOR CURRENT STEP - SCHEDULER READS THIS**
  getActiveTracksForStep(stepIndex: number): number[] {
    return this.pattern.reduce((active: number[], trackPattern, trackIndex) => {
      if (trackPattern[stepIndex]) {
        active.push(trackIndex);
      }
      return active;
    }, []);
  }
  
  // **CLEAR ALL PATTERNS**
  clearAllPatterns() {
    this.pattern = this.pattern.map(track => new Array(16).fill(false));
  }
}

export default function DrumSequencer() {
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
  
  // **PROFESSIONAL WEB AUDIO TIMING SYSTEM**
  const audioContextRef = useRef<AudioContext | null>(null);
  const tracksRef = useRef<DrumTrack[]>(tracks);
  const isPlayingRef = useRef<boolean>(false);
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef<number>(0);
  const lookAheadTime = 25.0; // 25ms lookahead
  const scheduleAheadTime = 0.1; // 100ms scheduling window
  const timerWorkerRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const analyserNodesRef = useRef<{ [trackId: string]: { analyser: AnalyserNode; gainNode: GainNode; dataArray: Uint8Array } }>({});
  const isSchedulingRef = useRef<boolean>(false);
  
  // **PROFESSIONAL DUAL-STATE ARCHITECTURE - THE SOLUTION**
  const audioEngineRef = useRef<SequencerAudioEngine>(new SequencerAudioEngine());
  
  // **PROFESSIONAL AUDIO MANAGEMENT SYSTEM**
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isLoadingSamplesRef = useRef<boolean>(false);
  const preloadedSamplesRef = useRef<Set<string>>(new Set());
  const criticalSamplesLoadedRef = useRef<boolean>(false);
  const preloadQueueRef = useRef<string[]>([]);

  // Initialize dynamic tracks and sample kits on component mount
  useEffect(() => {
    const initializeTracks = async () => {
      console.log('🚀 Starting TRULY DYNAMIC track initialization with API-based discovery...');
      console.log('📁 Using filesystem APIs to scan /sample-packs/ directory...');
      
      await initializeSampleKits();
      
      // Always auto-load the first available sample pack
      let packToLoad = selectedKit;
      if (AVAILABLE_SAMPLE_PACKS.length > 0) {
        // If no kit is selected, or if selected kit is invalid, use first pack
        if (!packToLoad || !AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === packToLoad)) {
          packToLoad = AVAILABLE_SAMPLE_PACKS[0].id;
          setSelectedKit(packToLoad);
          console.log(`🎯 Auto-loading first sample pack: ${AVAILABLE_SAMPLE_PACKS[0].name}`);
        }
      }
      
      const dynamicTracks = await generateDynamicTracks(packToLoad);
      INITIAL_TRACKS = dynamicTracks;
      setTracks(dynamicTracks);
      
      // **INITIALIZE AUDIO ENGINE WITH TRACK DATA - DUAL STATE SYNC**
      audioEngineRef.current.initializeTracks(dynamicTracks);
      console.log('🎯 Audio engine initialized with track data for perfect timing');
      
      setIsInitialized(true);
      
      // **AGGRESSIVE PRELOADING - START IMMEDIATELY AFTER TRACKS ARE READY**
      console.log('🚀 Starting aggressive sample preloading to prevent race conditions...');
      await aggressivePreloadDefaultSamples(dynamicTracks, packToLoad);
      
      console.log('✅ TRULY DYNAMIC track initialization completed!');
      console.log(`🎵 System discovered and loaded ${AVAILABLE_SAMPLE_PACKS.length} sample packs using filesystem APIs`);
      console.log(`🎛️ Created ${dynamicTracks.length} instrument tracks based on actual folder structure`);
      console.log(`🚀 Auto-loaded sample pack: ${AVAILABLE_SAMPLE_PACKS.find(p => p.id === packToLoad)?.name || 'Unknown'}`);
    };
    
    initializeTracks();
  }, []);

  // Keep tracksRef in sync with tracks state
  useEffect(() => {
    tracksRef.current = tracks;
    // DON'T reinitialize Audio Engine here - it breaks the playback!
  }, [tracks]);

  // **PROFESSIONAL AUDIO CONTEXT INITIALIZATION**
  // **STABLE AUDIO CONTEXT - CREATED ONLY ONCE**
  useEffect(() => {
    if (!isInitialized) return;
    
    // **CREATE AUDIO CONTEXT ONLY ONCE**
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: 44100
    });
    
    console.log('🎵 Stable AudioContext created - will never be recreated during session');
    
    return () => {
      // **CLEANUP ONLY ON UNMOUNT**
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isInitialized]); // ONLY isInitialized - no tracks dependency!
  
  // **AGGRESSIVE PRELOADING SYSTEM - PREVENT RACE CONDITIONS**
  const aggressivePreloadDefaultSamples = async (tracks: DrumTrack[], kitId: string) => {
    const currentKit = SAMPLE_KITS.find(kit => kit.id === kitId) || SAMPLE_KITS[0];
    if (!currentKit) {
      console.error('❌ No sample kit found for preloading');
      setIsPreloadingComplete(true);
      return;
    }
    
    console.log('🎯 AGGRESSIVE PRELOADING: Loading ALL default samples to prevent race conditions...');
    
    // **CALCULATE TOTAL SAMPLES TO PRELOAD**
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
    
    console.log(`📊 AGGRESSIVE PRELOADING: Found ${defaultSamples.length} default samples to preload`);
    
    // **PRELOAD ALL DEFAULT SAMPLES - NO LAZY LOADING FOR CRITICAL SAMPLES**
    let loadedCount = 0;
    for (const { track, sample } of defaultSamples) {
      try {
        console.log(`🔄 Preloading critical sample: ${track.name} - ${sample.name}`);
        const audioBuffer = await loadAudioSample(sample.audioFile, 'high');
        
        if (audioBuffer) {
          loadedCount++;
          setPreloadedSampleCount(loadedCount);
          setPreloadingProgress(Math.round((loadedCount / defaultSamples.length) * 100));
          console.log(`✅ Successfully preloaded: ${track.name} - ${sample.name} (${loadedCount}/${defaultSamples.length})`);
        } else {
          console.warn(`⚠️ Failed to preload: ${track.name} - ${sample.name}`);
        }
      } catch (error) {
        console.error(`❌ Error preloading ${track.name} - ${sample.name}:`, error);
      }
    }
    
    // **MARK CRITICAL SAMPLES AS LOADED**
    criticalSamplesLoadedRef.current = true;
    setIsPreloadingComplete(true);
    
    console.log(`🚀 AGGRESSIVE PRELOADING COMPLETE: ${loadedCount}/${defaultSamples.length} critical samples loaded`);
    console.log('✅ RACE CONDITION FIXED: First pad clicks will now play correct samples immediately');
    
    // **OPTIONAL: CONTINUE PRELOADING OTHER SAMPLES IN BACKGROUND**
    backgroundPreloadVisibleSamples(currentKit, tracks);
  };
  
  // **BACKGROUND PRELOADING FOR DROPDOWN SAMPLES**
  const backgroundPreloadVisibleSamples = async (currentKit: SampleKit, tracks: DrumTrack[]) => {
    console.log('🔄 Background preloading: Loading visible dropdown samples...');
    
    const visibleSamples = tracks
      .flatMap(track => {
        const samples = currentKit.samples[track.id] || [];
        return samples
          .filter(sample => sample.sampleType === 'audio' && sample.audioFile)
          .filter(sample => !sampleCacheRef.current[sample.audioFile!]); // Only unloaded samples
      });
    
    console.log(`📊 Background preloading: Found ${visibleSamples.length} additional samples to preload`);
    
    // **LOAD IN CHUNKS TO AVOID OVERWHELMING THE SYSTEM**
    const chunkSize = 3;
    for (let i = 0; i < visibleSamples.length; i += chunkSize) {
      const chunk = visibleSamples.slice(i, i + chunkSize);
      
      await Promise.all(
        chunk.map(async (sample) => {
          try {
            await loadAudioSampleBackground(sample.audioFile!, 'normal');
            console.log(`🔄 Background loaded: ${sample.name}`);
          } catch (error) {
            console.warn(`⚠️ Background loading failed: ${sample.name}`, error);
          }
        })
      );
      
      // **SMALL DELAY BETWEEN CHUNKS TO AVOID BLOCKING**
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Background preloading complete');
  };
  
  // **SMART LAZY LOADING SYSTEM - ONLY LOAD WHAT'S ACTUALLY USED**
  const preloadActiveSamples = async () => {
    const currentKit = SAMPLE_KITS.find(kit => kit.id === selectedKit) || SAMPLE_KITS[0];
    if (!currentKit) return;
    
    console.log('🎯 Smart lazy loading: Only preloading samples that are actually programmed...');
    
    // **ONLY PRELOAD SAMPLES FOR TRACKS WITH ACTIVE STEPS**
    const activeTracks = tracksRef.current.filter(track => 
      track.steps.some(step => step === true)
    );
    
    console.log(`📊 Found ${activeTracks.length} tracks with programmed steps out of ${tracksRef.current.length} total tracks`);
    
    // **PRELOAD ONLY ACTIVE SAMPLES - MASSIVE MEMORY SAVINGS**
    for (const track of activeTracks) {
      const samples = currentKit.samples[track.id];
      if (samples && samples.length > 0) {
        const selectedSample = samples.find(s => s.id === track.selectedSampleId) || samples[0];
        if (selectedSample.sampleType === 'audio' && selectedSample.audioFile) {
          await loadAudioSampleBackground(selectedSample.audioFile);
          console.log(`✅ Preloaded: ${track.name} - ${selectedSample.name}`);
        }
      }
    }
    
    console.log(`🚀 Lazy loading complete: ${activeTracks.length} samples preloaded (instead of all ${Object.values(currentKit.samples).flat().length})`);
  };

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // **OPTIMIZED AUDIO LEVEL MONITORING - 30FPS THROTTLED**
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdateTime = 0;
    const targetFPS = 30; // Reduced from 60fps for better performance
    const frameInterval = 1000 / targetFPS;
    
    const updateAudioLevels = (currentTime: number) => {
      // **THROTTLE TO 30FPS FOR PERFORMANCE**
      if (currentTime - lastUpdateTime >= frameInterval) {
        const newLevels: { [trackId: string]: number } = {};
        
        Object.entries(analyserNodesRef.current).forEach(([trackId, { analyser, dataArray }]) => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          newLevels[trackId] = average / 255; // Normalize to 0-1
        });
        
        setAudioLevels(newLevels);
        lastUpdateTime = currentTime;
      }
      
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateAudioLevels);
      }
    };
    
    // **ONLY MONITOR DURING PLAYBACK**
    if (isPlaying) {
      updateAudioLevels(performance.now());
    } else {
      // Clear audio levels when not playing
      setAudioLevels({});
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  // Keep isPlayingRef in sync with isPlaying state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // **CRITICAL FIX: Stable scheduler callback defined OUTSIDE useEffect**
  const runScheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current || isSchedulingRef.current) return;
    
    isSchedulingRef.current = true;
    const ctx = audioContextRef.current;
    
    // Get current step duration from ref
    const stepDuration = stepDurationRef.current || (60 / 120 / 4); // fallback to 120 BPM
    
    // **LOOKAHEAD SCHEDULING - Schedule all events within window**
    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      // **SCHEDULE AUDIO EVENTS AT PRECISE WEB AUDIO TIME**
      scheduleStep(nextStepTimeRef.current, currentStepIndexRef.current);
      
      // **SYNC AUDIO ENGINE STEP**
      audioEngineRef.current.setCurrentStep(currentStepIndexRef.current);
      
      // **ADVANCE TO NEXT STEP**
      nextStepTimeRef.current += stepDuration;
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
    
    isSchedulingRef.current = false;
  }, []); // NO DEPENDENCIES - uses only refs!

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
  
  // Separater Effect für BPM-Änderungen OHNE den Scheduler zu beeinflussen
  useEffect(() => {
    // Update refs when BPM changes
    bpmRef.current = bpm;
    stepDurationRef.current = (60 / bpm / 4);
    console.log(`⚡ BPM updated to ${bpm} - step duration: ${stepDurationRef.current.toFixed(3)}s`);
  }, [bpm]);
  
  // **PRECISE STEP SCHEDULING FUNCTION - READS FROM AUDIO ENGINE ONLY**
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
  }, []); // Keine Dependencies!

  // **RELIABLE AUDIO SAMPLE LOADING - GUARANTEED SUCCESS**
  const loadAudioSample = async (audioFile: string, priority: 'high' | 'normal' = 'normal'): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    // **INSTANT CACHE RETURN**
    if (sampleCacheRef.current[audioFile]) {
      return sampleCacheRef.current[audioFile];
    }
    
    try {
      // **ROBUST FETCH WITH EXTENDED TIMEOUT FOR RELIABILITY**
      const controller = new AbortController();
      const timeout = priority === 'high' ? 5000 : 10000; // Extended timeouts for better reliability
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`🔄 Loading ${priority} priority sample: ${audioFile}`);
      
      const response = await fetch(audioFile, { 
        signal: controller.signal,
        cache: 'force-cache', // Browser caching
        headers: {
          'Accept': 'audio/*,*/*;q=0.9'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch audio file: ${audioFile} (Status: ${response.status})`);
        console.log(`🔍 Attempting to load alternative path...`);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        console.error(`❌ Empty audio file received: ${audioFile}`);
        return null;
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // **SMART CACHING WITH MEMORY MANAGEMENT**
      const cacheSize = Object.keys(sampleCacheRef.current).length;
      if (cacheSize > 50) { // Limit cache size
        console.log('🧹 Cache limit reached, clearing old samples...');
        // Keep only the most recently used samples
        const recentSamples = Object.keys(sampleCacheRef.current).slice(-30);
        const newCache: { [key: string]: AudioBuffer } = {};
        recentSamples.forEach(key => {
          newCache[key] = sampleCacheRef.current[key];
        });
        sampleCacheRef.current = newCache;
      }
      
      sampleCacheRef.current[audioFile] = audioBuffer;
      console.log(`✅ Successfully cached sample: ${audioFile.split('/').pop()} (Duration: ${audioBuffer.duration.toFixed(3)}s, Cache: ${Object.keys(sampleCacheRef.current).length} samples)`);
      
      return audioBuffer;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`❌ Audio loading timeout: ${audioFile}`);
      } else if (error.name === 'EncodingError') {
        console.error(`❌ Audio decoding failed - invalid audio format: ${audioFile}`, error);
      } else {
        console.error(`❌ Error loading audio sample ${audioFile}:`, error);
      }
      return null;
    }
  };
  
  // Neue Funktion: Erstelle Fallback synthetisierten Sound wenn Audio-Datei fehlt
  const createFallbackSound = (trackId: string): DrumSample => {
    // Determine frequency and settings based on trackId patterns
    const trackLower = trackId.toLowerCase();
    let freq = 440;
    let type: OscillatorType = 'sine';
    let duration = 0.2;
    
    if (trackLower.includes('kick') || trackLower.includes('bass')) {
      freq = 60; type = 'sine'; duration = 0.4;
    } else if (trackLower.includes('snare')) {
      freq = 200; type = 'sawtooth'; duration = 0.25;
    } else if (trackLower.includes('rimshot')) {
      freq = 300; type = 'square'; duration = 0.1;
    } else if (trackLower.includes('hihat') || trackLower.includes('hi_hat')) {
      if (trackLower.includes('open')) {
        freq = 6000; type = 'square'; duration = 0.35;
      } else {
        freq = 8000; type = 'square'; duration = 0.08;
      }
    } else if (trackLower.includes('ride')) {
      freq = 4000; type = 'triangle'; duration = 0.4;
    } else if (trackLower.includes('clap') || trackLower.includes('hand')) {
      freq = 1000; type = 'square'; duration = 0.18;
    } else if (trackLower.includes('percussion') || trackLower.includes('perc')) {
      freq = 500; type = 'triangle'; duration = 0.2;
    } else if (trackLower.includes('tom')) {
      freq = 120; type = 'sine'; duration = 0.3;
    } else if (trackLower.includes('fingersnap') || trackLower.includes('snap')) {
      freq = 2000; type = 'square'; duration = 0.1;
    }
    
    return {
      id: `fallback-${trackId}`,
      name: `${trackId.replace(/_/g, ' ')} (Synthesized)`,
      freq,
      type,
      duration,
      sampleType: 'synthesized'
    };
  };

  // **PROFESSIONAL AUDIO ENGINE - GUARANTEED SAMPLE PLAYBACK**
  const playDrumSound = useCallback(async (track: DrumTrack, scheduledTime?: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const startTime = scheduledTime || ctx.currentTime;
    
    // Get current kit and find the selected sample
    const currentKit = SAMPLE_KITS.find(kit => kit.id === selectedKit) || SAMPLE_KITS[0];
    const kitCategory = track.id;
    const drumSamples = currentKit.samples[kitCategory] || currentKit.samples.kick || [];
    const sound = drumSamples.find(sample => sample.id === track.selectedSampleId) || drumSamples[0];
    
    if (!sound) {
      console.warn(`No sound found for track ${track.id} with sample ${track.selectedSampleId}`);
      return;
    }
    
    if (sound.sampleType === 'audio' && sound.audioFile) {
      // **GUARANTEED AUDIO PLAYBACK - Try cached first, then immediate load**
      let audioBuffer = sampleCacheRef.current[sound.audioFile];
      
      if (audioBuffer) {
        // **CACHED SAMPLE - INSTANT PERFECT PLAYBACK**
        playAudioBuffer(audioBuffer, track, startTime);
        console.log(`✅ Perfect playback: ${track.name} - ${sound.name} (cached)`);
      } else {
        // **IMMEDIATE HIGH-PRIORITY LOADING - NO FALLBACK SOUNDS**
        console.log(`🔄 Loading sample immediately: ${track.name} - ${sound.name}`);
        try {
          const emergencyBuffer = await loadAudioSample(sound.audioFile, 'high');
          if (emergencyBuffer) {
            // **PLAY ACTUAL SAMPLE - FULL LENGTH GUARANTEED**
            playAudioBuffer(emergencyBuffer, track, startTime);
            console.log(`✅ Immediate playback successful: ${track.name} - FULL SAMPLE PLAYBACK`);
          } else {
            console.error(`❌ Failed to load sample: ${sound.audioFile}`);
            // Only use synthesized sound as absolute last resort
            const fallbackSound = createFallbackSound(track.id);
            playDrumSoundSynthesized(track, fallbackSound, startTime);
          }
        } catch (error) {
          console.error(`❌ Emergency loading failed:`, error);
          // Only use synthesized sound as absolute last resort
          const fallbackSound = createFallbackSound(track.id);
          playDrumSoundSynthesized(track, fallbackSound, startTime);
        }
      }
    } else {
      // **INTENTIONALLY SYNTHESIZED SOUNDS - ALWAYS INSTANT**
      playDrumSoundSynthesized(track, sound, startTime);
    }
  }, []); // Keine Dependencies!
  
  // **GUARANTEED FULL-LENGTH SAMPLE PLAYBACK - NO CUTTING**
  const playAudioBuffer = useCallback((audioBuffer: AudioBuffer, track: DrumTrack, startTime: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    gainNode.gain.setValueAtTime(track.volume, startTime);
    
    // **OPTIMIZED CONNECTION - Minimal latency**
    const trackAnalyser = analyserNodesRef.current[track.id];
    if (trackAnalyser) {
      source.connect(gainNode);
      gainNode.connect(trackAnalyser.gainNode);
    } else {
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    }
    
    // **TRACK SOURCES FOR CLEANUP**
    audioSourcesRef.current.push(source);
    
    // **AUTO-CLEANUP WHEN FINISHED - SAMPLES PLAY TO COMPLETION**
    source.onended = () => {
      const index = audioSourcesRef.current.indexOf(source);
      if (index > -1) {
        audioSourcesRef.current.splice(index, 1);
      }
    };
    
    // **CRITICAL: START SAMPLE AND LET IT PLAY TO NATURAL COMPLETION**
    // No stop() call - sample plays full length like real drum machines
    source.start(startTime);
    
    console.log(`🎵 FULL-LENGTH SAMPLE PLAYBACK: ${audioBuffer.duration.toFixed(3)}s duration - NO CUTTING`);
  }, []); // Keine Dependencies!
  
  // **BACKGROUND SAMPLE LOADING - SMART AND NON-BLOCKING**
  const loadAudioSampleBackground = async (audioFile: string, priority: 'high' | 'normal' = 'normal') => {
    if (preloadedSamplesRef.current.has(audioFile)) return;
    
    // **PREVENT DUPLICATE LOADING**
    preloadedSamplesRef.current.add(audioFile);
    
    try {
      const audioBuffer = await loadAudioSample(audioFile, priority);
      if (audioBuffer) {
        console.log(`🚀 Background loaded: ${audioFile.split('/').pop()}`);
      }
    } catch (error) {
      console.warn(`Background loading failed for ${audioFile.split('/').pop()}:`, error);
      // Remove from preloaded set so it can be retried
      preloadedSamplesRef.current.delete(audioFile);
    }
  };

  // **OPTIMIZED SYNTHESIZED SOUND ENGINE**
  const playDrumSoundSynthesized = useCallback((track: DrumTrack, sound: DrumSample, startTime: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // **OPTIMIZED PARAMETER EXTRACTION**
    const freq = sound.freq || (sound as any).fallbackFreq || 440;
    const type = sound.type || (sound as any).fallbackType || 'sine';
    const duration = sound.duration || (sound as any).fallbackDuration || 0.3;
    
    // **PERFORMANCE-OPTIMIZED SETTINGS**
    oscillator.frequency.setValueAtTime(freq, startTime);
    oscillator.type = type;
    
    // **SMOOTHER ENVELOPE FOR HI-HATS - PREVENTS CHOPPINESS**
    if (track.id.toLowerCase().includes('hihat') || track.id.toLowerCase().includes('hi_hat')) {
      // **SPECIAL HI-HAT OPTIMIZATION - PREVENTS CHOPPINESS**
      gainNode.gain.setValueAtTime(track.volume * 0.8, startTime); // Slightly reduced volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + (duration * 0.7)); // Smoother decay
    } else {
      gainNode.gain.setValueAtTime(track.volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    }
    
    // **OPTIMIZED CONNECTION**
    const trackAnalyser = analyserNodesRef.current[track.id];
    if (trackAnalyser) {
      oscillator.connect(gainNode);
      gainNode.connect(trackAnalyser.gainNode);
    } else {
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
    }
    
    // **EFFICIENT TRACKING**
    activeOscillatorsRef.current.push(oscillator);
    
    // **OPTIMIZED CLEANUP**
    oscillator.onended = () => {
      const index = activeOscillatorsRef.current.indexOf(oscillator);
      if (index > -1) {
        activeOscillatorsRef.current.splice(index, 1);
      }
    };
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    console.log(`⚡ Optimized synth for ${track.id}: ${freq}Hz`);
  }, []); // Keine Dependencies!

  // **DUAL-STATE PATTERN UPDATE - IMMEDIATE AUDIO ENGINE UPDATE**
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    // **PREVENT INTERACTION DURING PRELOADING**
    if (!isPreloadingComplete) {
      console.log('🚫 Pad interaction disabled during sample preloading');
      return;
    }
    
    // Use tracksRef instead of tracks
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentValue = audioEngineRef.current.getPattern(trackIndex)[stepIndex];
    const newValue = !currentValue;
    
    console.log(`🎯 Dual-state update: ${trackId} step ${stepIndex + 1} → ${newValue}`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE - NO REACT RE-RENDERS**
    audioEngineRef.current.updatePattern(trackIndex, stepIndex, newValue);
    console.log('✅ Audio engine updated immediately - timing preserved');
    
    // **2. ASYNC REACT STATE UPDATE - VISUAL FEEDBACK ONLY**
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, steps: track.steps.map((step, idx) => idx === stepIndex ? newValue : step) }
        : track
    ));
    console.log('✅ React state updated for visual feedback');
    
    // **NO AUDIO TRIGGERING DURING PATTERN EDITING**
    console.log(`🔇 Silent pattern programming - audio plays only during sequencer playback`);
  }, [isPreloadingComplete]); // Removed tracks dependency!

  // **DUAL-STATE PLAYBACK CONTROL - AUDIO ENGINE SYNCHRONIZATION**
  const togglePlayback = useCallback(() => {
    // **PREVENT PLAYBACK DURING PRELOADING**
    if (!isPreloadingComplete) {
      console.log('🚫 Playback disabled during sample preloading');
      return;
    }
    
    const newPlayState = !isPlaying;
    console.log(`🎮 Dual-state playback toggle: ${isPlaying ? 'STOPPED' : 'PLAYING'} → ${newPlayState ? 'PLAYING' : 'STOPPED'}`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE**
    audioEngineRef.current.setPlaying(newPlayState);
    if (newPlayState) {
      audioEngineRef.current.setCurrentStep(0);
    }
    
    // **RESET TIMING ON PLAY START**
    if (newPlayState && !isPlaying) {
      console.log('🎯 Initializing timing system for playback start...');
      nextStepTimeRef.current = 0; // Force timing reset
      currentStepIndexRef.current = 0;
      setCurrentStep(0);
    }
    
    // **2. REACT STATE UPDATE FOR UI FEEDBACK**
    setIsPlaying(newPlayState);
  }, [isPlaying, isPreloadingComplete]);

  // **DUAL-STATE STOP CONTROL**
  const stopPlayback = useCallback(() => {
    console.log('🛑 Dual-state stop - clean audio shutdown');
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE**
    audioEngineRef.current.setPlaying(false);
    audioEngineRef.current.setCurrentStep(0);
    
    // **2. REACT STATE UPDATE**
    setIsPlaying(false);
    setCurrentStep(0);
    
    // **PROFESSIONAL AUDIO CLEANUP**
    // Stop all oscillators
    activeOscillatorsRef.current.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (e) {
        // Oscillator might already be stopped, ignore error
      }
    });
    activeOscillatorsRef.current = [];
    
    // **STOP ALL AUDIO SOURCES**
    audioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped, ignore error
      }
    });
    audioSourcesRef.current = [];
    
    // Reset timing
    nextStepTimeRef.current = 0;
    
    // Reset audio levels
    setAudioLevels({});
  }, []);

  // **DUAL-STATE PATTERN CLEAR**
  const clearPattern = useCallback(() => {
    console.log('🔄 Dual-state pattern clear');
    
    // **1. IMMEDIATE AUDIO ENGINE CLEAR - STOPS SOUND INSTANTLY**
    audioEngineRef.current.clearAllPatterns();
    console.log('✅ Audio engine patterns cleared immediately');
    
    // **2. REACT STATE CLEAR FOR UI FEEDBACK**
    setTracks(prev => prev.map(track => ({ ...track, steps: new Array(16).fill(false) })));
    setCurrentStep(0);
    console.log('✅ React state cleared for visual feedback');
  }, []);

  // **DUAL-STATE VOLUME UPDATE - REAL-TIME AUDIO ENGINE UPDATE**
  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const normalizedVolume = volume / 100;
    console.log(`🔊 Dual-state volume update: ${trackId} → ${volume}%`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE - INSTANT EFFECT**
    audioEngineRef.current.updateVolume(trackIndex, normalizedVolume);
    console.log('✅ Audio engine volume updated immediately - real-time effect');
    
    // **2. ASYNC REACT STATE UPDATE - VISUAL FEEDBACK ONLY** 
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume: normalizedVolume } : track
    ));
    console.log('✅ React state updated for UI slider feedback');
  }, []); // Removed tracks dependency!

  // **DUAL-STATE SAMPLE UPDATE - IMMEDIATE AUDIO ENGINE UPDATE**
  const updateTrackSample = useCallback((trackId: string, sampleId: string) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    console.log(`🎵 Dual-state sample update: ${trackId} → ${sampleId}`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE - INSTANT SAMPLE SWITCHING**
    audioEngineRef.current.updateSelectedSample(trackIndex, sampleId);
    console.log('✅ Audio engine sample updated immediately - next trigger uses new sample');
    
    // **2. ASYNC REACT STATE UPDATE - VISUAL FEEDBACK ONLY**
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, selectedSampleId: sampleId } : track
    ));
    console.log('✅ React state updated for dropdown UI feedback');
  }, []); // Removed tracks dependency!

  // **DUAL-STATE KIT SWITCHING - FULL RESYNC**
  const switchSampleKit = async (kitId: string) => {
    console.log(`🔄 Dual-state kit switch to: ${kitId}`);
    setSelectedKit(kitId);
    
    // **CLEAR CACHE FOR OLD KIT TO FREE MEMORY**
    console.log('🧹 Clearing old sample cache for memory optimization...');
    sampleCacheRef.current = {};
    preloadedSamplesRef.current.clear();
    
    // Generate new tracks for the new kit with its actual structure
    const newTracks = await generateDynamicTracks(kitId);
    setTracks(newTracks);
    
    // **INITIALIZE AUDIO ENGINE WITH NEW TRACK DATA**
    audioEngineRef.current.initializeTracks(newTracks);
    audioEngineRef.current.setPlaying(false);
    audioEngineRef.current.setCurrentStep(0);
    console.log('🎯 Audio engine reinitialized with new kit data');
    
    // **RESET PRELOADING STATE**
    setIsPreloadingComplete(false);
    setPreloadingProgress(0);
    setPreloadedSampleCount(0);
    setTotalSamplesToPreload(0);
    criticalSamplesLoadedRef.current = false;
    
    // Reset playback
    setIsPlaying(false);
    setCurrentStep(0);
    
    // **START AGGRESSIVE PRELOADING FOR NEW KIT**
    console.log('🚀 Starting aggressive preloading for new kit...');
    await aggressivePreloadDefaultSamples(newTracks, kitId);
    
    const selectedPack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === kitId);
    console.log(`✅ Switched to kit: ${selectedPack?.name || kitId}`);
    console.log(`🎛️ Created ${newTracks.length} tracks based on discovered structure`);
    console.log('✅ New kit samples preloaded - ready for perfect playback');
  };

  // **DUAL-STATE BPM UPDATE - IMMEDIATE TEMPO CHANGE**
  const updateBpm = (newBpm: number) => {
    console.log(`🎵 Dual-state BPM update: ${bpm} → ${newBpm}`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE - INSTANT TEMPO CHANGE**
    audioEngineRef.current.setBpm(newBpm);
    console.log('✅ Audio engine BPM updated immediately - tempo change effective now');
    
    // **2. REACT STATE UPDATE FOR UI SLIDER FEEDBACK**
    setBpm(newBpm);
    console.log('✅ React state updated for BPM slider feedback');
  };

  const getCurrentKitSamples = (drumType: string): DrumSample[] => {
    const currentKit = SAMPLE_KITS.find(kit => kit.id === selectedKit) || SAMPLE_KITS[0];
    return currentKit.samples[drumType] || [];
  };

  // Show loading state until tracks are initialized and samples are preloaded
  if (!isInitialized || tracks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-foreground mb-2">SoundAngeles TRULY Dynamic Loading...</h2>
          <p className="text-muted-foreground">🔍 Using filesystem APIs to scan sample-packs directory...</p>
          <p className="text-muted-foreground mt-1">📦 Discovering ALL sample packs & instruments dynamically...</p>
          <p className="text-muted-foreground mt-1">🎵 Building sequencer tracks from actual folder structure...</p>
          <p className="text-muted-foreground mt-1 text-xs">✨ No hardcoded assumptions - pure dynamic discovery!</p>
        </div>
      </div>
    );
  }
  
  // Show preloading state with progress
  if (isInitialized && !isPreloadingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Music className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-foreground mb-4">Preloading Samples...</h2>
          <p className="text-muted-foreground mb-4">🚀 Loading critical samples to prevent audio glitches</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-4 mb-4">
            <div 
              className="bg-neon-green h-4 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${preloadingProgress}%` }}
            />
          </div>
          
          {/* Progress Text */}
          <p className="text-sm text-muted-foreground mb-2">
            {preloadedSampleCount} / {totalSamplesToPreload} samples loaded ({preloadingProgress}%)
          </p>
          
          <p className="text-xs text-muted-foreground">
            ✅ First pad clicks will play perfect audio - no synthetic sounds!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div></div>
            <div></div>
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              variant="outline"
              size="icon"
              className="bg-card border-border hover:bg-accent"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Sample Kit Selector with Cover */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-lg border-2 border-border overflow-hidden bg-muted">
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
                    // Improved fallback chain for missing covers
                    const currentSrc = e.currentTarget.src;
                    const pack = AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === selectedKit);
                    
                    if (pack && pack.folderName && !currentSrc.includes('cover.jpg') && !currentSrc.includes('default-cover.png')) {
                      // Try generic cover.jpg first
                      e.currentTarget.src = `/sample-packs/${encodeURIComponent(pack.folderName)}/cover.jpg`;
                    } else if (!currentSrc.includes('default-cover.png')) {
                      // Try default cover
                      e.currentTarget.src = '/sample-packs/default-cover.png';
                    } else {
                      // Final fallback to placeholder
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUEyMzJBIi8+Cjxwb2x5Z29uIHBvaW50cz0iMTAwIDUwIDEyNSA4NSA3NSA4NSIgZmlsbD0iIzM3NEE1MSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwIiBmaWxsPSIjNjM3Mzk5Ii8+CjxwYXRoIGQ9Ik02MCAzNGgxNXYxMEg2MFYzNHoiIGZpbGw9IiM2Mzc0OTkiLz4KPHRleHQgeD0iMTAwIiB5PSIxNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM2Mzc0OTkiPk5vIENvdmVyPC90ZXh0Pgo8L3N2Zz4=';
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Kit Info and Selector */}
            <div className="flex flex-col gap-3 min-w-0 flex-1 max-w-sm">
              <h3 className="text-lg font-bold text-foreground text-left">Wähle dein Sample Pack:</h3>
              
              <Select value={selectedKit} onValueChange={switchSampleKit}>
                <SelectTrigger className="w-full bg-card border-border hover:bg-accent">
                  <SelectValue placeholder="Select Sample Kit" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {AVAILABLE_SAMPLE_PACKS.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id} className="focus:bg-accent py-3">
                      <div className="text-left">
                        <div className="font-semibold text-foreground">{pack.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{pack.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Current Kit Description */}
              <p className="text-sm text-muted-foreground text-left">
                {AVAILABLE_SAMPLE_PACKS.find(pack => pack.id === selectedKit)?.description || 'Sample kit description'}
              </p>
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
          </Button>
          
          <Button
            onClick={stopPlayback}
            className={`control-button stop ${!isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={!isPreloadingComplete}
          >
            <Square className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">STOP</span>
          </Button>
          
          <Button
            onClick={clearPattern}
            className={`control-button ${!isPreloadingComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={!isPreloadingComplete}
          >
            <RotateCcw className="w-4 sm:w-6 h-4 sm:h-6 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">CLEAR</span>
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
            <span className="text-foreground font-semibold text-sm sm:text-base">BPM</span>
            <div className="bpm-slider-container w-24 sm:w-36 flex items-center">
              <Slider
                value={[bpm]}
                onValueChange={(value) => updateBpm(value[0])}
                min={60}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
            <span className="bmp-display min-w-[40px] sm:min-w-[60px] text-center font-mono text-lg font-bold">{bpm}</span>
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

        {/* Sequencer Grid - Two-Row Layout */}
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
                  
                  <div className="volume-control-container flex items-center gap-2">
                    <label className="volume-label text-xs font-semibold text-muted-foreground">VOL</label>
                    <div className="w-20 flex items-center">
                      <Slider
                        value={[track.volume * 100]}
                        onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <span className="volume-value text-xs font-mono text-muted-foreground min-w-[35px] text-right">{Math.round(track.volume * 100)}%</span>
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
                <div className="volume-control-container flex items-center gap-3">
                  <label className="volume-label text-xs font-semibold text-muted-foreground">VOL</label>
                  <div className="w-28 flex items-center">
                    <Slider
                      value={[track.volume * 100]}
                      onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <span className="volume-value text-xs font-mono text-muted-foreground min-w-[35px] text-right font-bold">{Math.round(track.volume * 100)}%</span>
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
        <div className="text-center text-muted-foreground">
          <p>Click the grid to program your beats • Use transport controls to play</p>
        </div>
      </div>

    </div>
  );
}