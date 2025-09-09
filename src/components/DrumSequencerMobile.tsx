import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import AddToCartButton from '@/components/AddToCartButton';
import ProgrammerCredits from '@/components/ProgrammerCredits';
// TEST: Import ProfessionalAudioEngine
import { ProfessionalAudioEngine, TrackPattern } from '@/audio/AudioEngine';

interface DrumSample {
  id: string;
  name: string;
  freq?: number;
  type?: OscillatorType;
  duration?: number;
  preset?: string;
  audioFile?: string;
  sampleType: 'audio';
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

interface PatternBank {
  id: string;
  name: string;
  tracks: DrumTrack[];
  bpm: number;
  lastModified: Date;
}

// Mobile-optimized dynamic sample pack discovery
let AVAILABLE_SAMPLE_PACKS: any[] = [];
let SAMPLE_KITS: SampleKit[] = [];


// SIMPLIFIED: Load sample packs from static JSON file
const loadSamplePacksFromJSON = async (): Promise<void> => {
  try {
    console.log('📦 MOBILE: Loading sample data from /sample-packs-data.json...');
    
    const response = await fetch('/sample-packs-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load sample data: ${response.status}`);
    }
    
    const staticData = await response.json();
    
    // Convert to mobile format
    AVAILABLE_SAMPLE_PACKS = staticData.packs.map(pack => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      folderName: pack.folderName,
      coverImage: pack.coverImage
    }));
    
    console.log(`✅ MOBILE: Successfully loaded ${AVAILABLE_SAMPLE_PACKS.length} sample packs`);
  } catch (error) {
    console.error('❌ MOBILE: Failed to load sample packs:', error);
    AVAILABLE_SAMPLE_PACKS = [];
    throw error;
  }
};

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

// SIMPLIFIED: Load sample pack structure from JSON data
const loadSamplePackStructure = async (packId: string): Promise<SampleKit | null> => {
  const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === packId);
  if (!pack) return null;

  try {
    console.log(`📦 MOBILE: Loading structure for ${pack.name}...`);
    
    // Load JSON data again to get samples
    const response = await fetch('/sample-packs-data.json');
    if (!response.ok) {
      throw new Error(`Failed to load sample data: ${response.status}`);
    }
    
    const staticData = await response.json();
    const packData = staticData.packs.find(p => p.id === packId);
    if (!packData) {
      console.error(`❌ MOBILE: Pack ${packId} not found in JSON data`);
      return null;
    }

    const samples: { [drumType: string]: DrumSample[] } = {};
    const folderNames: { [drumType: string]: string } = {};
    
    // Get instruments for this pack from JSON
    const instrumentFolders = staticData.instruments[packData.folderName] || [];
    
    for (const folderName of instrumentFolders) {
      const trackId = getTrackIdFromFolder(folderName);
      const sampleData = staticData.samples[packData.folderName]?.[folderName] || [];
      
      if (sampleData.length > 0) {
        const folderSamples = sampleData.map((sample: any, index: number) => ({
          id: `${trackId}-${index + 1}-${Date.now()}`,
          name: sample.name.replace(/\.(wav|mp3)$/i, ''),
          audioFile: sample.path,
          sampleType: 'audio' as const
        }));
        
        samples[trackId] = folderSamples;
        folderNames[trackId] = folderName;
      }
    }
    
    console.log(`✅ MOBILE: Loaded ${pack.name}: ${Object.keys(samples).length} tracks`);
    
    return {
      id: packId,
      name: pack.name,
      description: pack.description,
      samples: samples,
      folderNames: folderNames
    };
  } catch (error) {
    console.error(`❌ MOBILE: Failed to load ${pack.name}:`, error);
    return null;
  }
};

// Function to get track ID from folder name (preserves original structure for IDs) (FROM DESKTOP v6.0.2)
const getTrackIdFromFolder = (folderName: string): string => {
  // Keep the original folder name as much as possible for the ID
  // Just replace spaces and special characters with underscores to make it a valid ID
  return folderName.replace(/[\s-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
};

// Function to get display name from folder name (preserves original folder names) (FROM DESKTOP v6.0.2)
const getDisplayNameFromFolder = (folderName: string): string => {
  // Keep the entire original folder name including numerical prefix
  return folderName;
};

// **API-BASED DYNAMIC WAV FILE DISCOVERY (FROM DESKTOP v6.0.2)**
// Uses filesystem API to discover ALL actual WAV files in any instrument folder
const loadSamplesFromFolder = async (packName: string, folderName: string, trackId: string): Promise<DrumSample[]> => {
  const samples: DrumSample[] = [];
  
  console.log(`🔎 MOBILE: Discovering samples for ${trackId} in: ${folderName}`);
  
  try {
    const response = await fetch(`/api/discover-samples?pack=${encodeURIComponent(packName)}&folder=${encodeURIComponent(folderName)}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ MOBILE: Error discovering samples:', data.error);
      return [];
    }
    
    const files = data.samples || data.files || []; // CRITICAL FIX: API returns 'samples', not 'files'
    
    if (files.length === 0) {
      console.warn(`⚠️ MOBILE: No audio files found in ${folderName}`);
      return [];
    }
    
    // Create sample objects for each discovered file
    files.forEach((fileName: string, index: number) => {
      const sampleId = `${trackId}-${index + 1}-${Date.now()}`;
      // **FIXED: Simplified path construction to prevent double encoding issues**
      const audioFilePath = `/sample-packs-mp3/${encodeURIComponent(packName)}/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`;
      
      samples.push({
        id: sampleId,
        name: fileName.replace(/\.(wav|mp3)$/i, ''), // Keep original filename as display name
        audioFile: audioFilePath,
        sampleType: 'audio'
      });
    });
    
    console.log(`🎵 MOBILE: Found ${samples.length} samples for ${trackId} in ${folderName}:`, files);
    
  } catch (error) {
    console.error('❌ MOBILE: Failed to discover samples:', error);
    return [];
  }
  
  return samples;
};




export default function DrumSequencerMobile() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [isPreloadingComplete, setIsPreloadingComplete] = useState(false);
  
  // QUANTISIERUNG STATE - From Desktop v6.0.2
  const [currentGroovePreset, setCurrentGroovePreset] = useState('normal');
  const [showInstruments, setShowInstruments] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [instrumentSliderIndex, setInstrumentSliderIndex] = useState(0);
  const [wippClickState, setWippClickState] = useState<{ [key: string]: 'normal' | 'left' | 'right' }>({});
  // Removed: const [isDraggingVolume, setIsDraggingVolume] - Not needed with Slider component
  const [preloadingProgress, setPreloadingProgress] = useState(0);
  const [preloadedSampleCount, setPreloadedSampleCount] = useState(0);

  // HERO SLIDER ANIMATION STATE - Sample Pack Carousel (from Desktop)
  const [isAutoSwiping, setIsAutoSwiping] = useState(false);
  const [hasShownAllPacks, setHasShownAllPacks] = useState(false);
  const [currentPackIndex, setCurrentPackIndex] = useState(0);
  
  // Removed: volumeContainerRef - Not needed with Slider component
  
  // Removed: dragVolumePercentage - Not needed with Slider component
  const [totalSamplesToPreload, setTotalSamplesToPreload] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEngineRef = useRef<ProfessionalAudioEngine>(new ProfessionalAudioEngine());
  
  
  // Pattern Banks State (from Desktop v6.0.2)
  const [patternBanks, setPatternBanks] = useState<PatternBank[]>([]);
  const [currentBankId, setCurrentBankId] = useState<string>('A');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // **PROFESSIONAL AUDIO MANAGEMENT SYSTEM (FROM DESKTOP v6.0.2)**
  const audioBufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const tracksRef = useRef<DrumTrack[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const volumePersistenceRef = useRef<{ [trackId: string]: number }>({});

  // **PROFESSIONAL INSTRUMENT COLORS - UNIQUE COLOR PER TRACK**
  const INSTRUMENT_COLORS = [
    '#D95D39', // 1. Burnt Orange
    '#E3B23C', // 2. Golden Yellow
    '#3A7D7C', // 3. Muted Teal
    '#78866B', // 4. Olive Green
    '#C97D8A', // 5. Dusty Rose
    '#6C4A77', // 6. Deep Purple
    '#D9C6A5', // 7. Warm Beige
    '#9C2B2E'  // 8. Brick Red
  ];

  // **EXTRACT FOLDER POSITION NUMBER - MAINTAINS SAMPLE PACK ORDER**
  const extractFolderPosition = (trackId: string): number => {
    // Extract number from folder names like "01-Kick Drums", "02-Snare", "03-Hi-Hat"
    const match = trackId.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 999; // Fallback to end if no number found
  };
  
  // **PROFESSIONAL WEB AUDIO TIMING SYSTEM - PRECISION TIMING (FROM DESKTOP v6.0.2)**
  const lookAheadTime = 25.0; // 25ms lookahead
  const scheduleAheadTime = 0.1; // 100ms scheduling window
  const timerWorkerRef = useRef<number>(0);
  const isSchedulingRef = useRef<boolean>(false);
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isLoadingSamplesRef = useRef<boolean>(false);
  const preloadedSamplesRef = useRef<Set<string>>(new Set());
  const criticalSamplesLoadedRef = useRef<boolean>(false);
  const preloadQueueRef = useRef<string[]>([]);
  
  // STABLE AUDIO CONTEXT FROM DESKTOP v6.0.2 - CREATED ONLY ONCE
  useEffect(() => {
    if (!isInitialized) return;
    
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 44100
      });
      console.log('🎵 Stable AudioContext created - will never be recreated');
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isInitialized]); // ONLY isInitialized - no tracks dependency!
  
  // Initialize sample packs with AGGRESSIVE PRELOADING FROM DESKTOP v6.0.2
  useEffect(() => {
    const initializeSamples = async () => {
      console.log('🔍 MOBILE: Starting sample pack discovery...');
      
      try {
        await loadSamplePacksFromJSON();
        console.log('🔍 MOBILE: Sample packs loaded:', AVAILABLE_SAMPLE_PACKS.length);
        
        if (AVAILABLE_SAMPLE_PACKS.length > 0) {
          const firstPack = AVAILABLE_SAMPLE_PACKS[0];
          console.log('🔍 MOBILE: Loading first pack:', firstPack.name);
          
          const kit = await loadSamplePackStructure(firstPack.id);
          console.log('🔍 MOBILE: Kit loaded:', kit ? `${Object.keys(kit.samples).length} instruments` : 'FAILED');
          
          if (kit) {
            SAMPLE_KITS = [kit];
            setSelectedKit(firstPack.id);
            
            // **SORT BY FOLDER NUMBER - CONSISTENT ORDER FROM START**
            const sortedTrackIds = Object.keys(kit.samples).sort((a, b) => {
              return extractFolderPosition(a) - extractFolderPosition(b);
            });
            
            const newTracks: DrumTrack[] = sortedTrackIds.map((trackId, index) => ({
              id: trackId,
              name: kit.folderNames?.[trackId] || trackId,
              color: '',
              steps: new Array(16).fill(false),
              volume: volumePersistenceRef.current[trackId] || 0.7, // VOLUME PERSISTENCE
              selectedSampleId: kit.samples[trackId][0]?.id || ''
            }));
            
            console.log('🔍 MOBILE: Created tracks:', newTracks.map(t => t.name));
            
            setTracks(newTracks);
            tracksRef.current = newTracks;
            
            // Convert DrumTrack[] to TrackPattern[] for ProfessionalAudioEngine
            const trackPatterns: TrackPattern[] = newTracks.map(track => ({
              id: track.id,
              name: track.name,
              steps: [...track.steps], // Deep copy
              volume: track.volume,
              selectedSampleId: track.selectedSampleId,
              muted: false // Mobile version doesn't have mute yet
            }));
            
            audioEngineRef.current.initializeTracks(trackPatterns);
            
            // Setup callback for ProfessionalAudioEngine step events
            audioEngineRef.current.onStepCallback = (trackId: string, sampleId: string, volume: number, time: number) => {
              const track = tracksRef.current.find(t => t.id === trackId);
              if (track) {
                console.log(`🔊 Professional callback: ${trackId} -> ${sampleId} @ volume ${volume.toFixed(2)}`);
                // Use existing playDrumSound function with timing
                playDrumSound(track, time);
              }
            };
            
            setIsInitialized(true);
            
            // Initialize Pattern Banks from Desktop v6.0.2
            console.log('🏦 MOBILE: Initializing Pattern Banks...');
            initializePatternBanks(newTracks, bpm);
            
            console.log('🔍 MOBILE: Initialization complete, starting preloading...');
            // AGGRESSIVE PRELOADING FROM DESKTOP
            await aggressivePreloadSamples(newTracks, firstPack.id);
          } else {
            console.error('❌ MOBILE: Failed to load kit structure');
          }
        } else {
          console.error('❌ MOBILE: No sample packs available');
        }
      } catch (error) {
        console.error('❌ MOBILE: Initialization failed:', error);
      }
    };
    
    initializeSamples();
  }, []);
  
  // AGGRESSIVE PRELOADING SYSTEM FROM DESKTOP v6.0.2
  const aggressivePreloadSamples = async (tracks: DrumTrack[], kitId: string) => {
    const kit = SAMPLE_KITS.find(k => k.id === kitId);
    if (!kit) {
      setIsPreloadingComplete(true);
      return;
    }
    
    console.log('🎯 AGGRESSIVE PRELOADING: Loading ALL default samples...');
    
    const defaultSamples = tracks
      .map(track => {
        const samples = kit.samples[track.id];
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
    
    let loadedCount = 0;
    for (const { track, sample } of defaultSamples) {
      try {
        const buffer = await loadAudioSample(sample.audioFile!, 'high');
        if (buffer) {
          loadedCount++;
          setPreloadedSampleCount(loadedCount);
          setPreloadingProgress(Math.round((loadedCount / defaultSamples.length) * 100));
        }
      } catch (error) {
        console.error(`Error preloading ${track.name}:`, error);
      }
    }
    
    setIsPreloadingComplete(true);
    console.log(`✅ Preloaded ${loadedCount}/${defaultSamples.length} samples`);
  };
  
  // **RELIABLE AUDIO SAMPLE LOADING - GUARANTEED SUCCESS (FROM DESKTOP v6.0.2)**
  const loadAudioSample = async (audioFile: string, priority: 'high' | 'normal' = 'normal'): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    // **INSTANT CACHE RETURN**
    if (audioBufferCache.current.has(audioFile)) {
      return audioBufferCache.current.get(audioFile)!;
    }
    
    try {
      // **ROBUST FETCH WITH EXTENDED TIMEOUT FOR RELIABILITY**
      const controller = new AbortController();
      const timeout = priority === 'high' ? 5000 : 10000; // Extended timeouts for better reliability
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`🔄 MOBILE: Loading ${priority} priority sample: ${audioFile}`);
      
      const response = await fetch(audioFile, { 
        signal: controller.signal,
        cache: 'force-cache', // Browser caching
        headers: {
          'Accept': 'audio/*,*/*;q=0.9'
        }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`❌ MOBILE: Failed to fetch audio file: ${audioFile} (Status: ${response.status})`);
        console.log(`🔍 MOBILE: Attempting to load alternative path...`);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        console.error(`❌ MOBILE: Empty audio file received: ${audioFile}`);
        return null;
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // **SMART CACHING WITH MEMORY MANAGEMENT**
      const cacheSize = audioBufferCache.current.size;
      if (cacheSize > 50) { // Limit cache size
        console.log('🧹 MOBILE: Cache limit reached, clearing old samples...');
        // Keep only the most recently used samples
        const entries = Array.from(audioBufferCache.current.entries());
        const recentEntries = entries.slice(-30);
        audioBufferCache.current.clear();
        recentEntries.forEach(([key, value]) => {
          audioBufferCache.current.set(key, value);
        });
      }
      
      audioBufferCache.current.set(audioFile, audioBuffer);
      console.log(`✅ MOBILE: Successfully cached sample: ${audioFile.split('/').pop()} (Duration: ${audioBuffer.duration.toFixed(3)}s, Cache: ${audioBufferCache.current.size} samples)`);
      
      return audioBuffer;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`❌ MOBILE: Audio loading timeout: ${audioFile}`);
      } else if (error.name === 'EncodingError') {
        console.error(`❌ MOBILE: Audio decoding failed - invalid audio format: ${audioFile}`, error);
      } else {
        console.error(`❌ MOBILE: Error loading audio sample ${audioFile}:`, error);
      }
      return null;
    }
  };
  
  // **PROFESSIONAL AUDIO ENGINE FROM DESKTOP v6.0.2 - GUARANTEED SAMPLE PLAYBACK**
  const playDrumSound = useCallback(async (track: DrumTrack, scheduledTime?: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const startTime = scheduledTime || ctx.currentTime;
    
    // Get current kit and find the selected sample
    const currentKit = SAMPLE_KITS.find(kit => kit.id === selectedKit) || SAMPLE_KITS[0];
    if (!currentKit) {
      console.warn(`No kit found for ${selectedKit}`);
      return;
    }
    
    const kitCategory = track.id;
    const drumSamples = currentKit.samples[kitCategory] || currentKit.samples.kick || [];
    const sound = drumSamples.find(sample => sample.id === track.selectedSampleId) || drumSamples[0];
    
    if (!sound) {
      console.warn(`No sound found for track ${track.id} with sample ${track.selectedSampleId}`);
      return;
    }
    
    console.log(`🎵 MOBILE: Playing ${track.name} - ${sound.name}`);
    
    if (sound.sampleType === 'audio' && sound.audioFile) {
      // **GUARANTEED AUDIO PLAYBACK - Try cached first, then immediate load**
      let audioBuffer = audioBufferCache.current.get(sound.audioFile);
      
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
            console.error(`❌ Failed to load sample: ${sound.audioFile} - No fallback available`);
          }
        } catch (error) {
          console.error(`❌ Emergency loading failed:`, error, '- No fallback available');
        }
      }
    } else {
      console.warn(`⚠️ No audio file available for ${track.name} - skipping playback`);
    }
  }, []); // No dependencies like Desktop version!

  // **GUARANTEED FULL-LENGTH SAMPLE PLAYBACK - NO CUTTING (FROM DESKTOP v6.0.2)**
  const playAudioBuffer = useCallback((audioBuffer: AudioBuffer, track: DrumTrack, startTime: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    gainNode.gain.setValueAtTime(track.volume, startTime);
    
    // **OPTIMIZED CONNECTION - Minimal latency**
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // **CRITICAL: START SAMPLE AND LET IT PLAY TO NATURAL COMPLETION**
    // No stop() call - sample plays full length like real drum machines
    source.start(startTime);
    
    console.log(`🎵 MOBILE FULL-LENGTH SAMPLE: ${audioBuffer.duration.toFixed(3)}s duration`);
  }, []); // No dependencies!

  
  // Keep refs in sync
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    bpmRef.current = bpm;
    stepDurationRef.current = 60 / bpm / 4;
  }, [bpm]);
  
  // Pattern Bank auto-save - track changes to patterns
  useEffect(() => {
    if (patternBanks.length > 0 && isInitialized) {
      setHasUnsavedChanges(true);
    }
  }, [tracks, bpm, patternBanks.length, isInitialized]);
  
  /**
   * QUANTIZATION SYSTEM - FROM DESKTOP v6.0.2
   */
  const getQuantizedTiming = useCallback((stepIndex: number, baseStepTime: number, stepDuration: number) => {
    const groovePreset = currentGroovePreset;
    
    switch (groovePreset) {
      case 'swing': {
        // 16D (16tel Dotted) Quantization: Strong triplet feel with heavy delay on off-beats
        const isOffBeat = stepIndex % 2 === 1;
        if (isOffBeat) {
          const dottedDelay = stepDuration * 0.5; // 50% delay for strong 16D feel
          console.log(`🎵 16D: Step ${stepIndex} delayed by ${(dottedDelay * 1000).toFixed(1)}ms (dotted 16th)`);
          return baseStepTime + dottedDelay;
        }
        return baseStepTime;
      }
      
      case 'light': {
        // Light Swing: Subtle swing feel with moderate off-beat delay (old swing algorithm)
        const isOffBeat = stepIndex % 2 === 1;
        if (isOffBeat) {
          const lightSwingDelay = stepDuration * 0.167; // 16.7% delay for subtle swing
          console.log(`🎵 LIGHT SWING: Step ${stepIndex} delayed by ${(lightSwingDelay * 1000).toFixed(1)}ms`);
          return baseStepTime + lightSwingDelay;
        }
        return baseStepTime;
      }
      
      case 'normal':
      default: {
        // Perfect timing - no modification
        return baseStepTime;
      }
    }
  }, [currentGroovePreset]);

  // PROFESSIONAL WEB AUDIO SCHEDULER FROM DESKTOP v6.0.2
  const runScheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const lookAheadTime = 0.1;
    const stepDuration = stepDurationRef.current;
    
    while (nextStepTimeRef.current < ctx.currentTime + lookAheadTime) {
      const activeTrackIds = audioEngineRef.current.getActiveTracksForStep(currentStepIndexRef.current);
      
      // Apply quantization to timing
      const quantizedStepTime = getQuantizedTiming(
        currentStepIndexRef.current, 
        nextStepTimeRef.current, 
        stepDuration
      );
      
      activeTrackIds.forEach((trackId) => {
        const track = tracksRef.current.find(t => t.id === trackId);
        if (track) {
          // Use quantized timing for playback
          playDrumSound(track, quantizedStepTime);
        }
      });
      
      setCurrentStep(currentStepIndexRef.current);
      nextStepTimeRef.current += stepDuration; // Base timing stays regular
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
  }, [playDrumSound, getQuantizedTiming]);
  
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      const ctx = audioContextRef.current;
      
      if (nextStepTimeRef.current === 0) {
        nextStepTimeRef.current = ctx.currentTime + 0.005;
        currentStepIndexRef.current = 0;
        stepDurationRef.current = 60 / bpm / 4;
      }
      
      schedulerIntervalRef.current = setInterval(runScheduler, 25);
    } else {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      nextStepTimeRef.current = 0;
      currentStepIndexRef.current = 0;
    }
    
    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
    };
  }, [isPlaying, runScheduler]);
  
  // Removed: Complex drag event handlers - Using simple Slider component instead
  
  const togglePlayback = () => {
    if (!audioContextRef.current) return;
    
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      setIsPlaying(true);
    }
  };

  // **PATTERN BANK MANAGEMENT - CRITICAL BUG FIX**
  // (Removed duplicate - using the advanced version with useCallback below)
  
  // (Removed duplicate clearPatternInBank - using the advanced version with useCallback below)
  
  // **DUAL-STATE PATTERN UPDATE - IMMEDIATE AUDIO ENGINE UPDATE (FROM DESKTOP v6.0.2)**
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    // **PREVENT INTERACTION DURING PRELOADING**
    if (!isPreloadingComplete) {
      console.log('🚫 Pad interaction disabled during sample preloading');
      return;
    }
    
    // Use tracksRef instead of tracks for immediate access
    const track = tracksRef.current.find(t => t.id === trackId);
    if (!track) return;
    
    const currentValue = track.steps[stepIndex];
    const newValue = !currentValue;
    
    console.log(`🎯 MOBILE Dual-state update: ${trackId} step ${stepIndex + 1} → ${newValue}`);
    
    // **1. IMMEDIATE AUDIO ENGINE UPDATE - NO REACT RE-RENDERS**
    audioEngineRef.current.updatePattern(trackId, stepIndex, newValue);
    console.log('✅ Audio engine pattern updated immediately - sequencer plays instantly');
    
    // **2. ASYNC REACT STATE UPDATE - VISUAL FEEDBACK ONLY** 
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, steps: track.steps.map((s, i) => i === stepIndex ? newValue : s) }
        : track
    ));
    console.log('✅ React state updated for visual feedback');
    
    // **NO AUDIO TRIGGERING DURING PATTERN EDITING - NO QUANTIZATION**
    console.log(`🔇 Silent pattern programming - audio plays only during sequencer playback (no quantization)`);
  }, [isPreloadingComplete]); // Only isPreloadingComplete dependency!
  
  // **SIMPLIFIED VOLUME UPDATE - IDENTICAL TO DESKTOP v6.0.2**
  const updateTrackVolume = useCallback((trackId: string, volumePercentage: number) => {
    console.log(`🔧 MOBILE: updateTrackVolume CALLED: trackId=${trackId}, volume=${volumePercentage}%`);
    
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) {
      console.log(`❌ MOBILE: Track not found: ${trackId}`);
      return;
    }
    
    // DESKTOP-IDENTICAL: Convert percentage to normalized (0-1)
    const normalizedVolume = volumePercentage / 100;
    console.log(`🎚️ MOBILE: Normalized volume: ${normalizedVolume} (${volumePercentage}%)`);
    
    // VOLUME PERSISTENCE FROM DESKTOP v6.0.2
    volumePersistenceRef.current[trackId] = normalizedVolume;
    console.log(`💾 MOBILE: Volume persistence updated for ${trackId}: ${normalizedVolume}`);
    
    // DUAL-STATE UPDATE - IMMEDIATE AUDIO ENGINE
    audioEngineRef.current.updateVolume(trackId, normalizedVolume);
    console.log(`🔊 MOBILE: Audio engine volume updated: index=${trackIndex}, volume=${normalizedVolume}`);
    
    // ASYNC REACT STATE UPDATE
    setTracks(prev => {
      const updated = prev.map(track => 
        track.id === trackId 
          ? { ...track, volume: normalizedVolume }
          : track
      );
      console.log(`📊 MOBILE: Track volume updated in state: ${trackId} -> ${normalizedVolume}`);
      return updated;
    });
  }, [tracks]);

  /**
   * BPM control - FROM DESKTOP VERSION
   */
  const updateBpm = (newBpm: number) => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setBpm(newBpm);
    }
    setBpm(newBpm);
  };


  const handleQuantizationChange = useCallback((preset: string) => {
    setCurrentGroovePreset(preset);
    console.log(`🎵 MOBILE: Quantization changed to: ${preset.toUpperCase()}`);
    
    // Provide user feedback about what each mode does
    switch (preset) {
      case 'swing':
        console.log('🎵 16D mode: Dotted 16th notes with strong triplet feel (50% delay)');
        break;
      case 'light':
        console.log('🎷 LIGHT SWING mode: Subtle swing feel for jazz/blues (16.7% delay)');
        break;
      case 'normal':
        console.log('🎯 NORMAL mode: Perfect mechanical timing');
        break;
    }
  }, []);
  
  const updateTrackSample = (trackId: string, sampleId: string) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, selectedSampleId: sampleId }
        : track
    ));
    
    // UPDATE AUDIO ENGINE
    audioEngineRef.current.updateSelectedSample(trackId, sampleId);
  };
  
  const getCurrentTrack = () => tracks[selectedTrackIndex];
  
  // Get current track color
  const getCurrentTrackColor = () => INSTRUMENT_COLORS[selectedTrackIndex % INSTRUMENT_COLORS.length];
  
  // Create lighter version of color for 3D gradient (40% lighter)
  const getLighterColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Make 40% lighter (closer to white)
    const lighterR = Math.min(255, Math.round(r + (255 - r) * 0.4));
    const lighterG = Math.min(255, Math.round(g + (255 - g) * 0.4));
    const lighterB = Math.min(255, Math.round(b + (255 - b) * 0.4));
    
    // Convert back to hex
    return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
  };
  
  // Handle swipe for sample pack switching
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit);
      let newIndex = currentIndex;
      
      if (isLeftSwipe && currentIndex < AVAILABLE_SAMPLE_PACKS.length - 1) {
        newIndex = currentIndex + 1;
      } else if (isRightSwipe && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }
      
      if (newIndex !== currentIndex) {
        switchSampleKit(AVAILABLE_SAMPLE_PACKS[newIndex].id);
      }
    }
  };
  
  const navigatePack = (direction: 'prev' | 'next') => {
    // Don't navigate during auto-swipe animation
    if (isAutoSwiping) return;
    
    const currentIndex = AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit);
    let newIndex = currentIndex;
    
    if (direction === 'next' && currentIndex < AVAILABLE_SAMPLE_PACKS.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }
    
    if (newIndex !== currentIndex) {
      switchSampleKit(AVAILABLE_SAMPLE_PACKS[newIndex].id);
    }
  };

  /**
   * HERO SLIDER ANIMATION - Fast slide-through all packs on first load
   * Shows users all available sample packs in a quick carousel animation
   */
  const startHeroSliderDemo = useCallback(() => {
    if (AVAILABLE_SAMPLE_PACKS.length <= 1 || hasShownAllPacks || !isPreloadingComplete) return;
    
    console.log('🎬 MOBILE: Starting hero slider demo - fast slide through all packs...');
    setIsAutoSwiping(true);
    
    let slideIndex = 0;
    const totalSlides = AVAILABLE_SAMPLE_PACKS.length;
    
    const slideNext = () => {
      if (slideIndex < totalSlides - 1) {
        slideIndex++;
        setCurrentPackIndex(slideIndex);
        // Switch to the next pack visually
        const nextPack = AVAILABLE_SAMPLE_PACKS[slideIndex];
        if (nextPack) {
          setSelectedKit(nextPack.id);
        }
        setTimeout(slideNext, 600); // 600ms per slide - fast!
      } else {
        // Animation complete - return to first pack
        console.log('✨ MOBILE: Hero slider complete - returning to first pack');
        setCurrentPackIndex(0);
        setIsAutoSwiping(false);
        setHasShownAllPacks(true);
        
        // Load the first pack for real
        if (AVAILABLE_SAMPLE_PACKS[0]) {
          switchSampleKit(AVAILABLE_SAMPLE_PACKS[0].id);
        }
      }
    };
    
    // Start sliding
    setTimeout(slideNext, 600);
  }, [hasShownAllPacks, isPreloadingComplete]);

  /**
   * HERO SLIDER TRIGGER - Start when packs are loaded and preloading is complete
   */
  useEffect(() => {
    if (AVAILABLE_SAMPLE_PACKS.length > 1 && !hasShownAllPacks && isPreloadingComplete && !isAutoSwiping) {
      // Start hero slider demo after short delay
      const startDelay = setTimeout(() => {
        startHeroSliderDemo();
      }, 1000); // 1s delay after load
      
      return () => clearTimeout(startDelay);
    }
  }, [AVAILABLE_SAMPLE_PACKS.length, hasShownAllPacks, isPreloadingComplete, isAutoSwiping, startHeroSliderDemo]);
  
  // **PATTERN-PRESERVING SAMPLE PACK SWITCHING - FROM DESKTOP v6.0.2**
  const switchSampleKit = async (kitId: string) => {
    console.log(`📦 MOBILE: Pattern-preserving switch to sample pack: ${kitId}`);
    
    const kit = await loadSamplePackStructure(kitId);
    if (!kit) {
      console.error(`❌ MOBILE: Failed to load kit structure for ${kitId}`);
      return;
    }

    SAMPLE_KITS = [kit];
    setSelectedKit(kitId);
    
    // **SORT BY FOLDER NUMBER - MAINTAINS SAMPLE PACK INTENDED ORDER**
    const availableTracks = Object.keys(kit.samples).sort((a, b) => {
      return extractFolderPosition(a) - extractFolderPosition(b);
    });
    
    const newTrackStructure: DrumTrack[] = availableTracks.map(trackId => ({
      id: trackId,
      name: kit.folderNames?.[trackId] || trackId,
      color: '',
      steps: new Array(16).fill(false), // Will be overwritten with preserved patterns
      volume: 0.7, // Will be overwritten with preserved volumes  
      selectedSampleId: kit.samples[trackId][0]?.id || ''
    }));
    
    console.log(`✅ MOBILE: Created ${newTrackStructure.length} tracks in FOLDER ORDER:`, 
      newTrackStructure.map(t => `${extractFolderPosition(t.id)}: ${t.id}`));

    // **PRESERVE EXISTING PATTERNS: Map current patterns to new pack structure**
    let preservedTracks: DrumTrack[];
    
    console.log(`🔍 MOBILE DEBUG: tracks.length = ${tracks.length}, tracks:`, tracks.map(t => `${t.id}:${t.steps.filter(s => s).length}`));
    
    if (tracks.length > 0) {
      console.log(`🔄 MOBILE: Preserving ${tracks.length} existing patterns for new pack`);
      
      // **PATTERN MAPPING BY POSITION - MAINTAINS FOLDER ORDER**
      preservedTracks = newTrackStructure.map((newTrack, index) => {
        // Map patterns by position: index 0 -> index 0, index 1 -> index 1, etc.
        const existingTrack = tracks[index];
        
        if (existingTrack) {
          console.log(`🎯 MOBILE: Pattern preserved: Position ${index}: ${existingTrack.id} -> ${newTrack.id}`);
        }
        
        return {
          ...newTrack, // New pack structure (id, name, samples, selectedSampleId)
          steps: existingTrack ? [...existingTrack.steps] : new Array(16).fill(false), // PRESERVE pattern OR empty
          volume: existingTrack ? existingTrack.volume : (volumePersistenceRef.current[newTrack.id] || 0.7), // PRESERVE volume OR persisted OR default
        };
      });
      
      console.log(`✅ MOBILE: Pattern preserved: ${preservedTracks.filter(t => t.steps.some(s => s)).length} tracks have active steps`);
    } else {
      // No existing patterns - create fresh ones with persisted volumes
      preservedTracks = newTrackStructure.map(track => ({
        ...track,
        volume: volumePersistenceRef.current[track.id] || 0.7
      }));
      console.log(`🆕 MOBILE: Created fresh patterns for ${preservedTracks.length} tracks`);
    }
    
    // **CRITICAL: Initialize audio engine with preserved patterns**
    // Convert DrumTrack[] to TrackPattern[] for ProfessionalAudioEngine
    const trackPatterns: TrackPattern[] = preservedTracks.map(track => ({
      id: track.id,
      name: track.name,
      steps: [...track.steps], // Deep copy
      volume: track.volume,
      selectedSampleId: track.selectedSampleId,
      muted: false // Mobile version doesn't have mute yet
    }));
    
    audioEngineRef.current.initializeTracks(trackPatterns);
    
    // Set UI state with preserved patterns
    setTracks(preservedTracks);
    tracksRef.current = preservedTracks;
    
    // **PRESERVE PATTERNS IN ALL BANKS: Update existing pattern banks with new pack structure**
    if (patternBanks.length > 0) {
      console.log('🔄 MOBILE: Updating existing pattern banks with new sample pack structure');
      
      setPatternBanks(prev => prev.map(bank => ({
        ...bank,
        tracks: bank.tracks.map((bankTrack, index) => {
          const newTrack = preservedTracks[index];
          if (newTrack) {
            return {
              ...newTrack, // New pack structure (id, name, samples, selectedSampleId)
              steps: [...bankTrack.steps], // PRESERVE existing pattern in bank
              volume: bankTrack.volume, // PRESERVE volume in bank
            };
          }
          return bankTrack; // Fallback to existing if no new track
        })
      })));
      
      const currentBank = patternBanks.find(b => b.id === currentBankId);
      if (currentBank) {
        console.log(`✅ MOBILE: Pattern preservation: Bank ${currentBankId} patterns maintained`);
      }
    } else {
      // First time - initialize pattern banks with preserved patterns
      console.log('🆕 MOBILE: Initializing pattern banks for first time with preserved patterns');
      initializePatternBanks(preservedTracks, bpm);
    }
    
    // **START AGGRESSIVE PRELOADING FOR NEW KIT**
    console.log('🚀 MOBILE: Starting aggressive preloading for new kit...');
    await aggressivePreloadSamples(preservedTracks, kitId);
    
    const selectedPack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === kitId);
    console.log(`✅ MOBILE: Switched to kit: ${selectedPack?.name || kitId}`);
    console.log(`🎛️ MOBILE: Patterns preserved across ${preservedTracks.length} tracks`);
    console.log('✅ MOBILE: New kit samples preloaded - ready for perfect playback with preserved patterns');
  };
  
  const getCurrentKitSamples = (trackId: string): DrumSample[] => {
    const kit = SAMPLE_KITS.find(k => k.id === selectedKit);
    return kit?.samples[trackId] || [];
  };
  
  // PATTERN BANK LOGIC FROM DESKTOP v6.0.2 - 100% PORT
  
  /**
   * Initialize pattern banks with default banks A, B, C, D
   */
  const initializePatternBanks = useCallback((initialTracks: DrumTrack[], initialBpm: number) => {
    const bankNames = ['A', 'B', 'C', 'D'];
    const defaultBanks: PatternBank[] = bankNames.map(name => ({
      id: name,
      name: `Pattern ${name}`,
      tracks: initialTracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false), // Empty pattern
        volume: track.volume
      })),
      bpm: initialBpm,
      lastModified: new Date()
    }));

    // Set Pattern A to current tracks (if any patterns exist)
    if (initialTracks.some(t => t.steps.some(step => step))) {
      defaultBanks[0].tracks = [...initialTracks];
    }

    setPatternBanks(defaultBanks);
    setCurrentBankId('A');
    setHasUnsavedChanges(false);
  }, []);

  /**
   * Save current pattern to the active bank
   */
  const saveCurrentPatternToBank = useCallback(() => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === currentBankId 
        ? { 
            ...bank, 
            tracks: [...tracks],
            bpm: bpm,
            lastModified: new Date()
          } 
        : bank
    ));
    setHasUnsavedChanges(false);
  }, [currentBankId, tracks, bpm]);

  /**
   * Load pattern from bank - WITH AUTO-SAVE
   */
  const loadPatternFromBank = useCallback((bankId: string) => {
    const bank = patternBanks.find(b => b.id === bankId);
    if (!bank) return;

    // CRITICAL FIX: Auto-save current pattern before switching
    if (bankId !== currentBankId) {
      console.log(`💾 Auto-saving current pattern in Bank ${currentBankId} before switch`);
      // Immediate save with current state
      setPatternBanks(prev => prev.map(bank => 
        bank.id === currentBankId 
          ? { 
              ...bank, 
              tracks: [...tracks],
              bpm: bpm,
              lastModified: new Date()
            } 
          : bank
      ));
    }

    console.log(`🔄 Loading Pattern Bank ${bankId}`);
    
    // Apply pattern to UI - DEEP COPY to prevent reference sharing
    const deepCopiedTracks: DrumTrack[] = bank.tracks.map(track => ({
      ...track,
      steps: [...track.steps], // Deep copy the steps array
      volume: track.volume,
      selectedSampleId: track.selectedSampleId,
      audioContext: track.audioContext,
      audioBuffer: track.audioBuffer
    }));
    
    setTracks(deepCopiedTracks);
    setBpm(bank.bpm);
    setCurrentBankId(bankId);
    
    // Apply pattern to Audio Engine - DEEP COPY
    tracksRef.current = deepCopiedTracks;
    // Convert DrumTrack[] to TrackPattern[] for ProfessionalAudioEngine - using deep copied tracks
    const trackPatterns: TrackPattern[] = deepCopiedTracks.map(track => ({
      id: track.id,
      name: track.name,
      steps: [...track.steps], // Deep copy from already deep copied tracks
      volume: track.volume,
      selectedSampleId: track.selectedSampleId,
      muted: false // Mobile version doesn't have mute yet
    }));
    
    audioEngineRef.current.initializeTracks(trackPatterns);
    
    setHasUnsavedChanges(false);
  }, [patternBanks, currentBankId, tracks, bpm]);

  /**
   * Copy pattern from one bank to another
   */
  const copyPatternToBank = useCallback((fromBankId: string, toBankId: string) => {
    if (fromBankId === toBankId) return;
    
    console.log(`📋 Copying pattern from Bank ${fromBankId} to Bank ${toBankId}`);
    
    // ✅ UNIFIED APPROACH: Always save current state first, then copy from saved state
    // This prevents ALL reference sharing issues
    
    // Step 1: If copying FROM current bank, save current live state first
    if (fromBankId === currentBankId) {
      console.log(`💾 Saving current live state to Bank ${fromBankId} before copying`);
      
      setPatternBanks(prev => prev.map(bank =>
        bank.id === fromBankId
          ? {
              ...bank,
              tracks: tracks.map(track => ({
                ...track,
                steps: [...track.steps], // Deep copy current live state
                volume: track.volume,
                selectedSampleId: track.selectedSampleId,
                audioContext: track.audioContext,
                audioBuffer: track.audioBuffer
              })),
              bpm: bpm,
              lastModified: new Date()
            }
          : bank
      ));
    }
    
    // Step 2: Always copy from patternBanks (after potential save in step 1)
    setTimeout(() => { // Allow state update to complete first
      const fromBank = patternBanks.find(b => b.id === fromBankId);
      if (!fromBank) {
        console.error(`❌ Source bank ${fromBankId} not found`);
        return;
      }
      
      console.log(`📋 Copying from saved Bank ${fromBankId} to Bank ${toBankId}`);
      
      // ✅ DEEP COPY: Prevent reference sharing
      const deepCopiedTracks: DrumTrack[] = fromBank.tracks.map(track => ({
        ...track,
        steps: [...track.steps], // Deep copy the steps array
        volume: track.volume,
        selectedSampleId: track.selectedSampleId,
        audioContext: track.audioContext,
        audioBuffer: track.audioBuffer
      }));
      
      setPatternBanks(prev => prev.map(bank => 
        bank.id === toBankId 
          ? { 
              ...bank, 
              tracks: deepCopiedTracks, // Use DEEP COPIED tracks
              bpm: fromBank.bpm,
              lastModified: new Date()
            } 
          : bank
      ));
      
      // Step 3: Auto-switch to target bank
      console.log(`🔄 Auto-switching from Bank ${currentBankId} to Bank ${toBankId}`);
      setCurrentBankId(toBankId);
    }, 50); // Small delay to ensure state update completed
  }, [patternBanks, currentBankId, tracks, bpm]);

  /**
   * Clear pattern in specified bank
   */
  const clearPatternInBank = useCallback((bankId: string) => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === bankId 
        ? { 
            ...bank, 
            tracks: bank.tracks.map(track => ({
              ...track,
              steps: new Array(16).fill(false)
            })),
            lastModified: new Date()
          } 
        : bank
    ));
    
    // If clearing current bank, also update live UI
    if (bankId === currentBankId) {
      const clearedTracks = tracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false)
      }));
      setTracks(clearedTracks);
      tracksRef.current = clearedTracks;
      // Convert DrumTrack[] to TrackPattern[] for ProfessionalAudioEngine
      const trackPatterns: TrackPattern[] = clearedTracks.map(track => ({
        id: track.id,
        name: track.name,
        steps: [...track.steps], // Deep copy
        volume: track.volume,
        selectedSampleId: track.selectedSampleId,
        muted: false // Mobile version doesn't have mute yet
      }));
      
      audioEngineRef.current.initializeTracks(trackPatterns);
    }
  }, [patternBanks, currentBankId]); // FIXED: Removed tracks dependency to prevent volume reset loop
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-black rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading Drum Sequencer...</p>
        </div>
      </div>
    );
  }
  
  // Show preloading state with progress
  if (isInitialized && !isPreloadingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-black rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Preparing samples...</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="h-2 rounded-full transition-all duration-300 ease-out bg-black"
              style={{ width: `${preloadingProgress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600">
            {preloadedSampleCount} / {totalSamplesToPreload} samples ({preloadingProgress}%)
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: 'white' }}>
      <style>{`
        .mobile-pad {
          position: relative;
          background: transparent;
          border: none;
          padding: 0;
        }
        
        .mobile-pad img {
          width: 100%;
          height: 100%;
          transition: all 0.1s ease;
        }
        
        .mobile-pad.active img {
          filter: brightness(1.2) saturate(1.3);
          transform: scale(0.98);
        }
        
        .mobile-pad.playing img {
          animation: pulse 0.2s;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        
        .volume-slider {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
        }
        
        .volume-slider-track {
          height: 100%;
          background: #DB1215;
          border-radius: 3px;
        }
        
        .instrument-button {
          background: #f8f8f8;
          border: 2px solid #e0e0e0;
        }
        
        .instrument-button.active {
          background: linear-gradient(to bottom, #fca5a5, #dc2626);
          color: white;
          border-color: #dc2626;
        }
      `}</style>
      

      {/* Scrollable Content Section */}
      <div className="bg-white">
        
        {/* Cover with Swipe - Perfect Square */}
        <div 
          className="relative aspect-square bg-gray-100 max-w-sm mx-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={(() => {
              const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === selectedKit);
              if (pack && pack.coverImage && pack.coverImage !== 'default-cover.png') {
                return `/sample-packs-mp3/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(pack.coverImage)}`;
              }
              return '/sample-packs-mp3/default-cover.png';
            })()}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/sample-packs-mp3/default-cover.png';
            }}
          />
          
          {/* Navigation Arrows with Animation Support */}
          <button
            onClick={() => navigatePack('prev')}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-md transition-all duration-200",
              isAutoSwiping && "animate-pulse opacity-60"
            )}
            disabled={AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit) === 0 || isAutoSwiping}
            title={isAutoSwiping ? "Auto-preview in progress..." : "Previous Sample Pack"}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={() => navigatePack('next')}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-md transition-all duration-200",
              isAutoSwiping && "animate-pulse opacity-60"
            )}
            disabled={AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit) === AVAILABLE_SAMPLE_PACKS.length - 1 || isAutoSwiping}
            title={isAutoSwiping ? "Auto-preview in progress..." : "Next Sample Pack"}
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {/* ADD TO CART BUTTON - 30px gap above (increased from 20px), 15px below (reduced from 20px), half width + centered */}
        <div className="bg-white px-4 flex justify-center" style={{ paddingTop: '30px', paddingBottom: '15px' }}>
          <div style={{ width: '50%' }}>
            <AddToCartButton 
              packName={AVAILABLE_SAMPLE_PACKS.find(p => p.id === selectedKit)?.name || ''}
            />
          </div>
        </div>
        
      </div>
      
      {/* SIMPLIFIED Wippschalter - ALWAYS VISIBLE */}
      <div className="bg-white px-4" style={{ paddingTop: '15px', paddingBottom: '25px' }}>
        
        {/* PLAY BUTTON - Anstelle des INSTRUMENTE Labels */}
        <div style={{ marginBottom: '11px' }}>
          <button
            onClick={togglePlayback}
            className={`
              w-full h-14 font-bold rounded-lg transition-all text-white text-lg
            ${isPlaying 
              ? 'bg-green-600 active:bg-green-700' 
              : ''
            }`}
            style={{
              backgroundColor: isPlaying ? undefined : '#8F7958'
            }}
          disabled={!isPreloadingComplete}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 mr-2 inline" />
              STOP
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2 inline" />
              PLAY
            </>
          )}
          </button>
        </div>
        
        {/* GLOBAL CONTROLS - BPM + Quantization - FLEXIBLE SINGLE ROW */}
        <div className="flex items-center gap-2" style={{ marginTop: '8px' }}>
          {/* BPM CONTROL - COMPACT */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                const newBpm = Math.max(60, bpm - 1);
                updateBpm(newBpm);
              }}
              className="w-8 h-10 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors text-sm font-medium"
              style={{ color: '#DB1215' }}
            >
              -
            </button>
            
            <div className="px-2 h-10 bg-white border border-gray-300 rounded flex items-center justify-center text-xs font-medium text-gray-700 whitespace-nowrap">
              {bpm}
            </div>
            
            <button
              onClick={() => {
                const newBpm = Math.min(200, bpm + 1);
                updateBpm(newBpm);
              }}
              className="w-8 h-10 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors text-sm font-medium"
              style={{ color: '#DB1215' }}
            >
              +
            </button>
          </div>
          
          {/* QUANTIZATION CONTROLS - FLEXIBLE */}
          <div className="flex gap-1 flex-1 min-w-0">
            {['NORMAL', 'LIGHT', 'SWING'].map(preset => {
              const presetId = preset.toLowerCase();
              return (
                <button
                  key={presetId}
                  onClick={() => handleQuantizationChange(presetId)}
                  className={`
                    h-10 px-1 text-xs font-bold border rounded transition-all flex-1 min-w-0 flex items-center justify-center
                    ${currentGroovePreset === presetId 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  style={{
                    backgroundColor: (currentGroovePreset === presetId) ? '#10b981' : undefined,
                    boxShadow: (currentGroovePreset === presetId) ? '0 0 10px rgba(16, 185, 129, 0.4)' : undefined
                  }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* DUAL MIRRORED LABELS BELOW BPM/QUANTIZATION */}
        <div className="flex items-center" style={{ marginTop: '11px', marginBottom: '29px' }}>
          {/* LEFT SIDE - BPM LABEL CENTERED UNDER BPM CONTROLS */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="w-8 h-px bg-gray-300"></div>
            <div className="px-2 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-300 tracking-wider">BPM</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
          </div>
          
          {/* CONTINUOUS LINE BETWEEN BPM AND QUANTIZATION */}
          <div className="flex-1 h-px bg-gray-300 mx-2"></div>
          
          {/* RIGHT SIDE - QUANTIZATION LABEL */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-8 h-px bg-gray-300"></div>
            <span className="px-4 text-sm font-bold text-gray-300 tracking-wider">QUANTIZATION</span>
            <div className="w-8 h-px bg-gray-300"></div>
          </div>
        </div>
        
        {/* INSTRUMENTS SECTION LABEL */}
        <div className="flex items-center" style={{ marginTop: '40px', marginBottom: '11px' }}>
          <div className="w-8 h-px bg-gray-300"></div>
          <span className="px-4 text-sm font-bold text-gray-300 tracking-wider">INSTRUMENTS</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>
        
        {/* 4x2 GRID für alle 8 Instrumente */}
        <div className="grid grid-cols-4 gap-2" style={{ marginBottom: '25px' }}>
          {tracks.length === 0 ? (
            // Show placeholder buttons when no tracks loaded
            Array.from({ length: 8 }, (_, index) => (
              <button
                key={`placeholder-${index}`}
                disabled
                className="h-10 px-1 rounded border-2 flex items-center justify-center text-xs font-bold"
                style={{ 
                  backgroundColor: '#f0f0f0',
                  borderColor: '#ccc',
                  color: '#999'
                }}
              >
                LOAD...
              </button>
            ))
          ) : (
            tracks.slice(0, 8).map((track, index) => {
              const isActive = selectedTrackIndex === index;
              
              // Extract clean instrument name
              const getCleanInstrumentName = (name: string): string => {
                // Remove numbers and common prefixes
                let clean = name.replace(/^\d+[-\s]*/, ''); // Remove "01-", "02 ", etc.
                clean = clean.replace(/\s+(drums?|drum)\s*$/i, ''); // Remove "Drums" suffix
                clean = clean.split(' ')[0]; // Take first word
                
                // Map common folder names to clean names
                const nameMap: { [key: string]: string } = {
                  'kick': 'KICK',
                  'snare': 'SNARE',
                  'hihat': 'HI-HAT',
                  'hi-hat': 'HI-HAT',
                  'crash': 'CRASH',
                  'ride': 'RIDE',
                  'tom': 'TOM',
                  'percussion': 'PERC',
                  'perc': 'PERC',
                  'cymbal': 'CYMBAL',
                  'open': 'OPEN',
                  'closed': 'CLOSED',
                  'cym': 'CRASH',
                  'clap': 'CLAP',
                  'conga': 'CONGA'
                };
                
                const lowerClean = clean.toLowerCase();
                return nameMap[lowerClean] || clean.toUpperCase().substring(0, 6);
              };
              
              const instrumentName = getCleanInstrumentName(track.name);
              
              // Get unique color for this track
              const trackColor = INSTRUMENT_COLORS[index % INSTRUMENT_COLORS.length];
              
              return (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrackIndex(index)}
                  className="h-10 px-1 rounded flex flex-col items-center justify-center text-xs font-bold transition-all relative"
                  style={{ 
                    backgroundColor: isActive ? trackColor : '#f0f0f0',
                    color: isActive ? 'white' : '#333',
                    fontSize: '11px'
                  }}
                >
                  <span>{instrumentName || 'UNKNOWN'}</span>
                  {/* Color indicator line - always visible 5px below text */}
                  <div 
                    className="absolute bottom-1 w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: trackColor }}
                  />
                </button>
              );
            })
          )}
        </div>
        
        {/* Step Sequencer Label with Decorative Lines */}
        <div className="flex items-center" style={{ marginTop: '40px', marginBottom: '11px' }}>
          <div className="w-8 h-px bg-gray-300"></div>
          <h3 className="px-4 text-sm font-bold text-gray-300">STEP SEQUENCER</h3>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>
        
        {/* 2x8 Pad Grid - Step Sequencer Style mit LED-Laufleiste */}
        <div style={{ marginBottom: '25px' }}>
          {/* First Group: PAD Row 1 + LED Row 1 (Steps 1-8) */}
          <div className="space-y-1">
            {/* First Row - Steps 1-8 */}
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 8 }, (_, index) => {
                const track = getCurrentTrack();
                const isActive = track?.steps[index] || false;
                const isCurrentStep = index === currentStep && isPlaying;
                const isBeatMarker = [0, 4].includes(index); // Beat markers for first row
                const trackColor = getCurrentTrackColor();
                const lighterTrackColor = getLighterColor(trackColor);
                
                return (
                  <button
                    key={index}
                    onClick={() => track && toggleStep(track.id, index)}
                    className={`
                      w-full transition-all text-xs font-bold border rounded flex items-end justify-center pb-1
                      ${
                        isActive 
                          ? 'text-white' 
                          : 'text-gray-700 border-gray-300 hover:bg-gray-200'
                      }
                      ${
                        isCurrentStep 
                          ? 'ring-2 ring-blue-400 ring-offset-1' 
                          : ''
                      }
                    `}
                    style={{
                      background: isActive 
                        ? `linear-gradient(to bottom, ${lighterTrackColor}, ${trackColor})`
                        : 'linear-gradient(to bottom, #ffffff, #e5e7eb)',
                      aspectRatio: '1 / 1.3'
                    }}
                  >
                    <span className={
                      isBeatMarker 
                        ? (isActive ? 'text-white font-bold' : 'text-red-600 font-bold')
                        : (isActive ? 'text-white font-bold' : 'text-current')
                    }>
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* LED-LAUFLEISTE für Steps 1-8 (UNTER den Pads) */}
            <div className="grid grid-cols-8 gap-1 mt-1">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={`led-${i}`}
                  className="h-1 transition-all duration-150 rounded-sm"
                  style={{
                    backgroundColor: i === currentStep && isPlaying ? '#DB1215' : '#e0e0e0',
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* 11px Gap between groups */}
          <div style={{ height: '11px' }}></div>
          
          {/* Second Group: PAD Row 2 + LED Row 2 (Steps 9-16) */}
          <div className="space-y-1">
            {/* Second Row - Steps 9-16 */}
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 8 }, (_, index) => {
                const stepIndex = index + 8; // Steps 8-15 (0-indexed)
                const track = getCurrentTrack();
                const isActive = track?.steps[stepIndex] || false;
                const isCurrentStep = stepIndex === currentStep && isPlaying;
                const isBeatMarker = [0, 4].includes(index); // Beat markers for second row (steps 9 and 13)
                const trackColor = getCurrentTrackColor();
                const lighterTrackColor = getLighterColor(trackColor);
                
                return (
                  <button
                    key={stepIndex}
                    onClick={() => track && toggleStep(track.id, stepIndex)}
                    className={`
                      w-full transition-all text-xs font-bold border rounded flex items-end justify-center pb-1
                      ${
                        isActive 
                          ? 'text-white' 
                          : 'text-gray-700 border-gray-300 hover:bg-gray-200'
                      }
                      ${
                        isCurrentStep 
                          ? 'ring-2 ring-blue-400 ring-offset-1' 
                          : ''
                      }
                    `}
                    style={{
                      background: isActive 
                        ? `linear-gradient(to bottom, ${lighterTrackColor}, ${trackColor})`
                        : 'linear-gradient(to bottom, #ffffff, #e5e7eb)',
                      aspectRatio: '1 / 1.3'
                    }}
                  >
                    <span className={
                      isBeatMarker 
                        ? (isActive ? 'text-white font-bold' : 'text-red-600 font-bold')
                        : (isActive ? 'text-white font-bold' : 'text-current')
                    }>
                      {stepIndex + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* LED-LAUFLEISTE für Steps 9-16 (UNTER den Pads) */}
            <div className="grid grid-cols-8 gap-1 mt-1">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={`led-${i + 8}`}
                  className="h-1 transition-all duration-150 rounded-sm"
                  style={{
                    backgroundColor: (i + 8) === currentStep && isPlaying ? '#DB1215' : '#e0e0e0',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Instrument Control Label with Decorative Lines */}
        <div className="flex items-center" style={{ marginTop: '40px', marginBottom: '11px' }}>
          <div className="w-8 h-px bg-gray-300"></div>
          <h3 className="px-4 text-sm font-bold text-gray-300">INSTRUMENT CONTROL</h3>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* KOMPAKTE 2-SPALTEN LAYOUT - Sample Navigation (Pads 9-12) + Horizontal Volume (Pads 13-16) */}
        {getCurrentTrack() && (
          <div style={{ touchAction: 'auto' }}>
            
            {/* HORIZONTAL LAYOUT: Sample Navigation + Volume Slider */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* SAMPLE NAVIGATION - Linke Hälfte (Pads 9-12 Breite) */}
              <div className="flex gap-1">
                {/* Sample Previous Button */}
                <button
                  onClick={() => {
                    const track = getCurrentTrack();
                    if (!track) return;
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : samples.length - 1;
                    updateTrackSample(track.id, samples[prevIndex].id);
                  }}
                  className="w-10 h-10 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors text-sm font-medium"
                  style={{ color: '#DB1215' }}
                >
                  ←
                </button>
                
                {/* Sample Counter */}
                <div className="flex-1 h-10 bg-white border border-gray-300 rounded flex items-center justify-center text-xs font-medium text-gray-700">
                  {(() => {
                    const track = getCurrentTrack();
                    if (!track) return '1/16';
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    return `${currentIndex + 1}/${samples.length}`;
                  })()}
                </div>
                
                {/* Sample Next Button */}
                <button
                  onClick={() => {
                    const track = getCurrentTrack();
                    if (!track) return;
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    const nextIndex = currentIndex < samples.length - 1 ? currentIndex + 1 : 0;
                    updateTrackSample(track.id, samples[nextIndex].id);
                  }}
                  className="w-10 h-10 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors text-sm font-medium"
                  style={{ color: '#DB1215' }}
                >
                  →
                </button>
              </div>
              
              {/* HORIZONTAL VOLUME SLIDER - Rechte Hälfte (Pads 13-16 Breite) */}
              {(() => {
                const currentTrack = getCurrentTrack();
                if (!currentTrack) return null;
                
                return (
                  <div className="relative">
                    {/* HORIZONTAL VOLUME SLIDER - 0% links, 100% rechts */}
                    <div className="h-10 relative bg-white border border-gray-300 rounded">
                      {/* Gefüllte Fläche von links bis zum aktuellen Volume-Level */}
                      <div 
                        className="absolute left-0 top-0 h-full rounded-l transition-all duration-200"
                        style={{ 
                          width: `${currentTrack.volume * 100}%`,
                          backgroundColor: getCurrentTrackColor()
                        }}
                      />
                      
                      {/* Horizontal Slider */}
                      <Slider
                        value={[currentTrack.volume * 100]}
                        onValueChange={(value) => updateTrackVolume(currentTrack.id, value[0])}
                        min={0}
                        max={100}
                        step={1}
                        orientation="horizontal"
                        className="w-full h-full absolute top-0 left-0 z-10 [&>span:first-child]:hidden [&>span:last-child]:hidden [&>[role=slider]]:w-3 [&>[role=slider]]:h-full [&>[role=slider]]:rounded-none [&>[role=slider]]:bg-black [&>[role=slider]]:border-0 [&>[role=slider]]:shadow-none"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
            
            
            {/* LABELS unter den Controls - FIXED POSITIONING */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {/* Sample Label - FIXED WIDTH CENTERED */}
              <div className="text-xs font-bold text-gray-700 text-center" style={{ minWidth: '120px' }}>
                {(() => {
                  const track = getCurrentTrack();
                  if (!track) return (
                    <>
                      <span style={{ color: getCurrentTrackColor() }}>KICK</span> SAMPLES
                    </>
                  );
                  
                  // Extract clean instrument name ohne Nummerierung
                  let cleanName = track.name.replace(/^\d+[-\s]*/, ''); // Remove "01-", "02 ", etc.
                  cleanName = cleanName.replace(/\s+(drums?|drum)\s*$/i, ''); // Remove "Drums" suffix
                  cleanName = cleanName.split(' ')[0]; // Take first word
                  
                  // Map common folder names to clean names
                  const nameMap: { [key: string]: string } = {
                    'kick': 'KICK',
                    'snare': 'SNARE',
                    'hihat': 'HI-HAT',
                    'hi-hat': 'HI-HAT',
                    'crash': 'CRASH',
                    'ride': 'RIDE',
                    'tom': 'TOM',
                    'percussion': 'PERCUSSION',
                    'perc': 'PERC',
                    'cymbal': 'CYMBAL',
                    'open': 'OPEN',
                    'closed': 'CLOSED',
                    'cym': 'CRASH',
                    'clap': 'CLAP',
                    'conga': 'CONGA'
                  };
                  
                  const lowerClean = cleanName.toLowerCase();
                  const instrumentName = nameMap[lowerClean] || cleanName.toUpperCase();
                  
                  return (
                    <>
                      <span style={{ color: getCurrentTrackColor() }}>{instrumentName}</span> SAMPLES
                    </>
                  );
                })()}
              </div>
              
              {/* Volume Label - FIXED WIDTH CENTERED */}
              <div className="text-xs font-bold text-gray-700 text-center" style={{ minWidth: '140px' }}>
                {(() => {
                  const currentTrack = getCurrentTrack();
                  if (!currentTrack) return (
                    <>
                      <span style={{ color: getCurrentTrackColor() }}>KICK</span> VOLUME 70%
                    </>
                  );
                  
                  // Extract clean instrument name
                  let cleanName = currentTrack.folderName || currentTrack.name;
                  cleanName = cleanName.replace(/^\d+[-\s]*/, ''); // Remove numerical prefix
                  cleanName = cleanName.replace(/\s+(drums?|drum)\s*$/i, ''); // Remove "Drums" suffix
                  cleanName = cleanName.split(' ')[0]; // Take first word
                  
                  // Map common folder names to clean names
                  const nameMap: { [key: string]: string } = {
                    'kick': 'KICK',
                    'snare': 'SNARE',
                    'hihat': 'HI-HAT',
                    'hi-hat': 'HI-HAT',
                    'crash': 'CRASH',
                    'ride': 'RIDE',
                    'tom': 'TOM',
                    'percussion': 'PERCUSSION',
                    'perc': 'PERC',
                    'cymbal': 'CYMBAL',
                    'open': 'OPEN',
                    'closed': 'CLOSED',
                    'cym': 'CRASH',
                    'clap': 'CLAP',
                    'conga': 'CONGA'
                  };
                  
                  const lowerClean = cleanName.toLowerCase();
                  const instrumentName = nameMap[lowerClean] || cleanName.toUpperCase();
                  
                  return (
                    <>
                      <span style={{ color: getCurrentTrackColor() }}>{instrumentName}</span> VOLUME {Math.round(currentTrack.volume * 100)}%
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        
        {/* Banks Label with Decorative Lines */}
        <div className="flex items-center" style={{ marginTop: '40px', marginBottom: '11px' }}>
          <div className="w-8 h-px bg-gray-300"></div>
          <h3 className="px-4 text-sm font-bold text-gray-300">BANKS</h3>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Pattern Banks Control - Grid System */}
        {patternBanks.length > 0 && (
          <div className="grid grid-cols-8 gap-1" style={{ marginBottom: '25px' }}>
            {/* Pattern Bank Switches A-D */}
            {patternBanks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => loadPatternFromBank(bank.id)}
                className={`
                  col-span-1 h-10 text-xs font-bold border-2 rounded transition-all
                  ${currentBankId === bank.id 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }
                `}
                title={`Load Pattern ${bank.id}`}
                aria-label={`Pattern Bank ${bank.id}${currentBankId === bank.id ? ' (Active)' : ''}`}
              >
                {bank.id}
              </button>
            ))}

            {/* COPY Button */}
            <Select onValueChange={(toBankId) => copyPatternToBank(currentBankId, toBankId)} value="">
              <SelectTrigger className="col-span-2 h-10 text-sm font-medium border-gray-300">
                <SelectValue placeholder="COPY">COPY</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {patternBanks.filter(b => b.id !== currentBankId).map(bank => (
                  <SelectItem key={bank.id} value={bank.id} className="text-sm">
                    Copy to {bank.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* CLEAR Button */}
            <Select onValueChange={(value) => {
              if (value === 'all') {
                // Clear all pattern banks
                patternBanks.forEach(bank => clearPatternInBank(bank.id));
              } else {
                clearPatternInBank(value);
              }
            }} value="">
              <SelectTrigger className="col-span-2 h-10 text-sm font-medium border-gray-300">
                <SelectValue placeholder="CLEAR">CLEAR</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {patternBanks.map(bank => (
                  <SelectItem key={bank.id} value={bank.id} className="text-sm">
                    Clear {bank.id}
                  </SelectItem>
                ))}
                <SelectItem value="all" className="text-sm font-bold text-red-600">
                  Clear All
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
      </div>
      
      {/* LOGO & TITLE SECTION - At Bottom, Vertical Layout with small logo */}
      <div className="bg-white">
        <div className="flex flex-col items-center justify-center" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          <img 
            src="/SoundAngelesLogo.svg" 
            alt="SoundAngeles"
            className="h-5 mb-1"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span className="text-xs font-medium text-gray-600">DRUM SEQUENCER</span>
        </div>
      </div>
      
      {/* Programmer Credits - Fixed Bottom Right */}
      <ProgrammerCredits position="mobile" />
      
      {/* End Scrollable Content Section */}
    </div>
  );
}