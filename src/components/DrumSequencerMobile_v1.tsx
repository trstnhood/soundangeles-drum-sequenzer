import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotaryKnob } from './RotaryKnob';

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

// PROFESSIONAL ISOLATED AUDIO ENGINE FROM DESKTOP v6.0.2
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
  
  getActiveTracksForStep(stepIndex: number): number[] {
    return this.pattern.reduce((active: number[], trackPattern, trackIndex) => {
      if (trackPattern[stepIndex]) {
        active.push(trackIndex);
      }
      return active;
    }, []);
  }
  
  clearAllPatterns() {
    this.pattern = this.pattern.map(track => new Array(16).fill(false));
  }
}

// Reuse API functions from desktop version
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

const loadSamplePackStructure = async (packId: string): Promise<SampleKit | null> => {
  const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === packId);
  if (!pack) return null;

  try {
    const instrumentFolders = await discoverInstrumentFolders(pack.folderName);
    const sampleKit: SampleKit = {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      samples: {},
      folderNames: {}
    };

    for (const folderName of instrumentFolders) {
      const response = await fetch(`/api/discover-samples?pack=${encodeURIComponent(pack.folderName)}&folder=${encodeURIComponent(folderName)}`);
      const data = await response.json();
      
      if (!data.error && data.samples && data.samples.length > 0) {
        const trackId = `track-${folderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        sampleKit.samples[trackId] = data.samples.map((sampleFile: string) => ({
          id: `${trackId}-${sampleFile.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: sampleFile.replace(/\.[^/.]+$/, ''),
          audioFile: `/sample-packs/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(folderName)}/${encodeURIComponent(sampleFile)}`,
          sampleType: 'audio' as const
        }));
        sampleKit.folderNames![trackId] = folderName;
      }
    }

    return sampleKit;
  } catch (error) {
    console.error(`❌ Failed to load ${pack.name}:`, error);
    return null;
  }
};


export default function DrumSequencerMobile() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [isPreloadingComplete, setIsPreloadingComplete] = useState(false);
  const [showInstruments, setShowInstruments] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [instrumentSliderIndex, setInstrumentSliderIndex] = useState(0);
  const [wippClickState, setWippClickState] = useState<{ [key: string]: 'normal' | 'left' | 'right' }>({});
  const [masterVolume, setMasterVolume] = useState(100);
  const [preloadingProgress, setPreloadingProgress] = useState(0);
  const [preloadedSampleCount, setPreloadedSampleCount] = useState(0);
  const [totalSamplesToPreload, setTotalSamplesToPreload] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEngineRef = useRef<SequencerAudioEngine>(new SequencerAudioEngine());
  
  // Volume Knob States
  const [volumeKnobDragging, setVolumeKnobDragging] = useState(false);
  const [volumeKnobStartY, setVolumeKnobStartY] = useState(0);
  const [volumeKnobStartValue, setVolumeKnobStartValue] = useState(0);
  
  // Pattern Banks State (from Desktop v6.0.2)
  const [patternBanks, setPatternBanks] = useState<PatternBank[]>([]);
  const [currentBankId, setCurrentBankId] = useState<string>('A');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const audioBufferCache = useRef<Map<string, AudioBuffer>>(new Map());
  const tracksRef = useRef<DrumTrack[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef<number>(0);
  const currentStepIndexRef = useRef<number>(0);
  const stepDurationRef = useRef<number>(0);
  const bpmRef = useRef<number>(120);
  const volumePersistenceRef = useRef<{ [trackId: string]: number }>({});
  
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
        await discoverSamplePacks();
        console.log('🔍 MOBILE: Sample packs discovered:', AVAILABLE_SAMPLE_PACKS.length);
        
        if (AVAILABLE_SAMPLE_PACKS.length > 0) {
          const firstPack = AVAILABLE_SAMPLE_PACKS[0];
          console.log('🔍 MOBILE: Loading first pack:', firstPack.name);
          
          const kit = await loadSamplePackStructure(firstPack.id);
          console.log('🔍 MOBILE: Kit loaded:', kit ? `${Object.keys(kit.samples).length} instruments` : 'FAILED');
          
          if (kit) {
            SAMPLE_KITS = [kit];
            setSelectedKit(firstPack.id);
            
            const newTracks: DrumTrack[] = Object.keys(kit.samples).map((trackId, index) => ({
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
            audioEngineRef.current.initializeTracks(newTracks);
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
        const buffer = await loadAudioSample(sample.audioFile!);
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
  
  // RELIABLE AUDIO SAMPLE LOADING FROM DESKTOP v6.0.2
  const loadAudioSample = async (audioFile: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    if (audioBufferCache.current.has(audioFile)) {
      return audioBufferCache.current.get(audioFile)!;
    }
    
    try {
      const response = await fetch(audioFile);
      if (!response.ok) return null;
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      audioBufferCache.current.set(audioFile, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading ${audioFile}:`, error);
      return null;
    }
  };
  
  const playDrumSound = useCallback(async (track: DrumTrack, scheduledTime?: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const kit = SAMPLE_KITS.find(k => k.id === selectedKit);
    if (!kit) return;
    
    const samples = kit.samples[track.id] || [];
    const sound = samples.find(s => s.id === track.selectedSampleId);
    if (!sound || !sound.audioFile) return;
    
    const startTime = scheduledTime || ctx.currentTime;
    
    try {
      let buffer = audioBufferCache.current.get(sound.audioFile);
      
      if (!buffer) {
        buffer = await loadAudioSample(sound.audioFile);
        if (!buffer) return;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = ctx.createGain();
      // MASTER VOLUME AS MULTIPLIER FROM DESKTOP v6.0.2
      gainNode.gain.value = track.volume * (masterVolume / 100);
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(startTime);
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }, [selectedKit, masterVolume]);
  
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
  
  // PROFESSIONAL WEB AUDIO SCHEDULER FROM DESKTOP v6.0.2
  const runScheduler = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const lookAheadTime = 0.1;
    const stepDuration = stepDurationRef.current;
    
    while (nextStepTimeRef.current < ctx.currentTime + lookAheadTime) {
      const activeTrackIndexes = audioEngineRef.current.getActiveTracksForStep(currentStepIndexRef.current);
      
      activeTrackIndexes.forEach((trackIndex) => {
        const track = tracksRef.current[trackIndex];
        if (track) {
          playDrumSound(track, nextStepTimeRef.current);
        }
      });
      
      setCurrentStep(currentStepIndexRef.current);
      nextStepTimeRef.current += stepDuration;
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
  }, [playDrumSound]);
  
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
  
  const toggleStep = (trackId: string, stepIndex: number) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    setTracks(prev => {
      const updated = prev.map(track => 
        track.id === trackId 
          ? { ...track, steps: track.steps.map((s, i) => i === stepIndex ? !s : s) }
          : track
      );
      
      // UPDATE AUDIO ENGINE IMMEDIATELY
      const newValue = !tracks[trackIndex].steps[stepIndex];
      audioEngineRef.current.updatePattern(trackIndex, stepIndex, newValue);
      
      return updated;
    });
  };
  
  const updateTrackVolume = (trackId: string, volume: number) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const normalizedVolume = volume / 100;
    
    // VOLUME PERSISTENCE FROM DESKTOP v6.0.2
    volumePersistenceRef.current[trackId] = normalizedVolume;
    
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, volume: normalizedVolume }
        : track
    ));
    
    // UPDATE AUDIO ENGINE
    audioEngineRef.current.updateVolume(trackIndex, normalizedVolume);
  };
  
  const updateTrackSample = (trackId: string, sampleId: string) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, selectedSampleId: sampleId }
        : track
    ));
    
    // UPDATE AUDIO ENGINE
    audioEngineRef.current.updateSelectedSample(trackIndex, sampleId);
  };
  
  const updateBpm = (value: number) => {
    setBpm(value);
    if (audioEngineRef.current) {
      audioEngineRef.current.setBpm(value);
    }
  };
  
  const getCurrentTrack = () => tracks[selectedTrackIndex];
  
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
  
  const switchSampleKit = async (kitId: string) => {
    const kit = await loadSamplePackStructure(kitId);
    if (kit) {
      SAMPLE_KITS = [kit];
      setSelectedKit(kitId);
      
      const newTracks: DrumTrack[] = Object.keys(kit.samples).map((trackId, index) => ({
        id: trackId,
        name: kit.folderNames?.[trackId] || trackId,
        color: '',
        steps: new Array(16).fill(false),
        volume: volumePersistenceRef.current[trackId] || 0.7, // PRESERVE VOLUMES
        selectedSampleId: kit.samples[trackId][0]?.id || ''
      }));
      
      setTracks(newTracks);
      tracksRef.current = newTracks;
      audioEngineRef.current.initializeTracks(newTracks);
      
      // Reinitialize Pattern Banks with new track structure
      console.log('🏦 MOBILE: Reinitializing Pattern Banks for new kit...');
      initializePatternBanks(newTracks, bpm);
      
      // PRELOAD NEW SAMPLES
      await aggressivePreloadSamples(newTracks, kitId);
    }
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
    
    // Apply pattern to UI
    setTracks([...bank.tracks]);
    setBpm(bank.bpm);
    setCurrentBankId(bankId);
    
    // Apply pattern to Audio Engine
    tracksRef.current = [...bank.tracks];
    audioEngineRef.current.initializeTracks(bank.tracks);
    
    setHasUnsavedChanges(false);
  }, [patternBanks, currentBankId, tracks, bpm]);

  /**
   * Copy pattern from one bank to another
   */
  const copyPatternToBank = useCallback((fromBankId: string, toBankId: string) => {
    if (fromBankId === toBankId) return;
    
    // If copying FROM current bank, use LIVE pattern
    if (fromBankId === currentBankId) {
      console.log(`📋 Copying LIVE pattern from current Bank ${fromBankId} to Bank ${toBankId}`);
      
      setPatternBanks(prev => prev.map(bank => 
        bank.id === toBankId 
          ? { 
              ...bank, 
              tracks: [...tracks], // Use CURRENT live tracks
              bpm: bpm, // Use CURRENT live BPM
              lastModified: new Date()
            } 
          : bank
      ));
    } else {
      // Copying from SAVED bank to another bank
      const fromBank = patternBanks.find(b => b.id === fromBankId);
      if (!fromBank) return;
      
      console.log(`📋 Copying saved pattern from Bank ${fromBankId} to Bank ${toBankId}`);
      
      setPatternBanks(prev => prev.map(bank => 
        bank.id === toBankId 
          ? { 
              ...bank, 
              tracks: [...fromBank.tracks],
              bpm: fromBank.bpm,
              lastModified: new Date()
            } 
          : bank
      ));
    }
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
      audioEngineRef.current.initializeTracks(clearedTracks);
    }
  }, [patternBanks, currentBankId, tracks]);
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <img 
            src="/ui-elements/soundangeles-logo.svg" 
            alt="SoundAngeles"
            className="w-16 h-16 mx-auto mb-4"
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
          <h2 className="text-xl font-bold mb-2 text-gray-800">Loading SoundAngeles...</h2>
          <p className="text-sm text-gray-600 mb-4">🔍 Using filesystem APIs to scan sample-packs directory...</p>
          <p className="text-xs text-gray-500">✨ No hardcoded assumptions - pure dynamic discovery!</p>
        </div>
      </div>
    );
  }
  
  // Show preloading state with progress
  if (isInitialized && !isPreloadingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <img 
            src="/ui-elements/soundangeles-logo.svg" 
            alt="SoundAngeles"
            className="w-16 h-16 mx-auto mb-4 animate-bounce"
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Preloading Samples...</h2>
          <p className="text-gray-600 mb-4">🚀 Loading critical samples to prevent audio glitches</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="h-4 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${preloadingProgress}%`,
                background: '#DB1215'
              }}
            />
          </div>
          
          {/* Progress Text */}
          <p className="text-sm text-gray-600 mb-2">
            {preloadedSampleCount} / {totalSamplesToPreload} samples loaded ({preloadingProgress}%)
          </p>
          
          <p className="text-xs text-gray-500">
            ✅ First pad clicks will play perfect audio - no synthetic sounds!
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
          background: #DB1215;
          color: white;
          border-color: #DB1215;
        }
      `}</style>
      
      {/* Top Section - Logo & Cover */}
      <div className="bg-white shadow-sm">
        {/* Logo and Title */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img 
              src="/ui-elements/soundangeles-logo.svg" 
              alt="SoundAngeles"
              className="h-6"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-lg font-bold" style={{ color: '#DB1215' }}>SOUNDANGELES MOBILE v2</h1>
          </div>
          <span className="text-xs font-medium text-gray-600">DRUM SEQUENCER</span>
        </div>
        
        {/* Cover with Swipe */}
        <div 
          className="relative h-36 bg-gray-100"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={(() => {
              const pack = AVAILABLE_SAMPLE_PACKS.find(p => p.id === selectedKit);
              if (pack && pack.coverImage && pack.coverImage !== 'default-cover.png') {
                return `/sample-packs/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(pack.coverImage)}`;
              }
              return '/sample-packs/default-cover.png';
            })()}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/sample-packs/default-cover.png';
            }}
          />
          
          {/* Navigation Arrows */}
          <button
            onClick={() => navigatePack('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-md"
            disabled={AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit) === 0}
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={() => navigatePack('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow-md"
            disabled={AVAILABLE_SAMPLE_PACKS.findIndex(p => p.id === selectedKit) === AVAILABLE_SAMPLE_PACKS.length - 1}
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          
          {/* Pack Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <h2 className="text-sm font-bold text-white">
              {AVAILABLE_SAMPLE_PACKS.find(p => p.id === selectedKit)?.name}
            </h2>
          </div>
        </div>
        
        {/* BPM and Master Volume Control */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-3">
          {/* BPM Control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-600 w-12">BPM</span>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => updateBpm(parseInt(e.target.value))}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #DB1215 0%, #DB1215 ${(bpm - 60) / 120 * 100}%, #e0e0e0 ${(bpm - 60) / 120 * 100}%, #e0e0e0 100%)`
              }}
            />
            <span className="text-sm font-bold min-w-[40px] text-center" style={{ color: '#DB1215' }}>{bpm}</span>
          </div>
          
          {/* Master Volume Control */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-600 w-12">MSTR</span>
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseInt(e.target.value))}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #DB1215 0%, #DB1215 ${masterVolume}%, #e0e0e0 ${masterVolume}%, #e0e0e0 100%)`
              }}
            />
            <span className="text-sm font-bold min-w-[40px] text-center" style={{ color: '#DB1215' }}>{masterVolume}%</span>
          </div>
        </div>
      </div>
      
      {/* SIMPLIFIED Wippschalter - ALWAYS VISIBLE */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h3 className="text-center text-sm font-bold text-gray-700 mb-3">INSTRUMENTE</h3>
        
        {/* DEBUG: Show track count */}
        <div className="text-xs text-gray-500 text-center mb-2">
          {tracks.length} tracks loaded
        </div>
        
        {/* 4x2 GRID für alle 8 Instrumente */}
        <div className="grid grid-cols-4 gap-2 mb-4">
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
              console.log(`Track ${index}: "${track.name}" -> "${instrumentName}"`);
              
              return (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrackIndex(index)}
                  className="h-10 px-1 rounded border-2 flex items-center justify-center text-xs font-bold transition-all"
                  style={{ 
                    backgroundColor: isActive ? '#DB1215' : '#f0f0f0',
                    borderColor: isActive ? '#DB1215' : '#ccc',
                    color: isActive ? 'white' : '#333',
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                >
                  {instrumentName || 'UNKNOWN'}
                </button>
              );
            })
          )}
        </div>
        
        {/* Sample Navigation + Volume Control für aktives Instrument */}
        {getCurrentTrack() && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded" style={{ touchAction: 'pan-y pinch-zoom' }}>
            {/* Links: Sample Navigation - horizontal zentriert mit mehr Platz */}
            <div className="flex flex-col justify-center items-center h-full">
              {/* Zentrierte Beschriftung über Sample-Anzeige */}
              <div className="text-xs font-bold text-gray-600 mb-2 text-center">
                {(() => {
                  const track = getCurrentTrack();
                  if (!track) return 'Samples:';
                  
                  // Extract clean instrument name ohne Nummerierung
                  let cleanName = track.name.replace(/^\d+[-\s]*/, ''); // Remove "01-", "02 ", etc.
                  cleanName = cleanName.replace(/\s+(drums?|drum)\s*$/i, ''); // Remove "Drums" suffix
                  cleanName = cleanName.split(' ')[0]; // Take first word
                  
                  // Map common folder names to clean names
                  const nameMap: { [key: string]: string } = {
                    'kick': 'Kick',
                    'snare': 'Snare',
                    'hihat': 'Hi-Hat',
                    'hi-hat': 'Hi-Hat',
                    'crash': 'Crash',
                    'ride': 'Ride',
                    'tom': 'Tom',
                    'percussion': 'Percussion',
                    'perc': 'Percussion',
                    'cymbal': 'Cymbal',
                    'open': 'Open',
                    'closed': 'Closed',
                    'cym': 'Crash',
                    'clap': 'Clap',
                    'conga': 'Conga'
                  };
                  
                  const lowerClean = cleanName.toLowerCase();
                  const instrumentName = nameMap[lowerClean] || cleanName;
                  
                  return `${instrumentName} Samples:`;
                })()}
              </div>
              <div className="flex items-center gap-2 px-2">
                {/* Previous Sample Button - größer für bessere Bedienbarkeit */}
                <button
                  onClick={() => {
                    const track = getCurrentTrack();
                    if (!track) return;
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : samples.length - 1;
                    updateTrackSample(track.id, samples[prevIndex].id);
                  }}
                  className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors"
                  style={{ color: '#DB1215' }}
                >
                  ←
                </button>
                
                {/* Current Sample Display - breiter für bessere Lesbarkeit */}
                <div className="px-4 py-2 bg-white border border-gray-300 rounded text-center text-xs font-medium text-gray-700 min-w-[4rem]">
                  {(() => {
                    const track = getCurrentTrack();
                    if (!track) return '1';
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    return `${currentIndex + 1}/${samples.length}`;
                  })()}
                </div>
                
                {/* Next Sample Button - größer für bessere Bedienbarkeit */}
                <button
                  onClick={() => {
                    const track = getCurrentTrack();
                    if (!track) return;
                    const samples = getCurrentKitSamples(track.id);
                    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                    const nextIndex = currentIndex < samples.length - 1 ? currentIndex + 1 : 0;
                    updateTrackSample(track.id, samples[nextIndex].id);
                  }}
                  className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors"
                  style={{ color: '#DB1215' }}
                >
                  →
                </button>
              </div>
            </div>
            
            {/* Rechts: Volume Knob - zentriert zu Pads 2+3 und PERC+CONGA */}
            <div className="flex flex-col items-center justify-center h-full relative min-h-[100px]">
              {/* Volume percentage display - oben links vom Knob */}
              <div className="absolute top-2 left-2 text-xs font-bold text-gray-600 px-1 pointer-events-none">
                {Math.round((getCurrentTrack()?.volume || 0.7) * 100)}%
              </div>
              
              <div 
                className={`flex items-center justify-center ${volumeKnobDragging ? 'scale-110' : ''} transition-transform`}
                style={{ 
                  transform: 'scale(1.2)',
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                onTouchStart={(e: React.TouchEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const currentValue = Math.round((getCurrentTrack()?.volume || 0.7) * 100);
                  console.log('Touch start:', e.touches[0].clientY);
                  setVolumeKnobDragging(true);
                  setVolumeKnobStartY(e.touches[0].clientY);
                  setVolumeKnobStartValue(currentValue);
                }}
                onTouchMove={(e: React.TouchEvent) => {
                  if (!volumeKnobDragging) return;
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const currentY = e.touches[0].clientY;
                  const deltaY = volumeKnobStartY - currentY; // Up = positive
                  const sensitivity = 0.5;
                  const newValue = volumeKnobStartValue + (deltaY * sensitivity);
                  const clampedValue = Math.max(0, Math.min(100, Math.round(newValue)));
                  
                  console.log('Touch move:', { deltaY, newValue, clampedValue });
                  
                  const track = getCurrentTrack();
                  if (track) {
                    updateTrackVolume(track.id, clampedValue);
                  }
                }}
                onTouchEnd={(e: React.TouchEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Touch end');
                  setVolumeKnobDragging(false);
                }}
              >
                <img
                  src={(() => {
                    const currentValue = Math.round((getCurrentTrack()?.volume || 0.7) * 100);
                    const frameIndex = Math.floor((currentValue / 100) * 255);
                    const paddedIndex = frameIndex.toString().padStart(4, '0');
                    return `/ui-elements/knob_mid-volume-instruments/Knob_mid_${paddedIndex}.png`;
                  })()}
                  alt="Volume Knob"
                  className="w-16 h-16 object-contain pointer-events-none"
                  draggable={false}
                  style={{ filter: volumeKnobDragging ? 'brightness(1.1)' : 'none' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      
      {/* Main Content - Scrollable if needed */}
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50">
        {/* Step Sequencer Label */}
        <h3 className="text-center text-sm font-bold text-gray-700 mb-2">STEP SEQUENCER</h3>
        
        {/* 2x8 Pad Grid - Step Sequencer Style */}
        <div className="space-y-1 max-w-lg mx-auto mb-4">
          {/* First Row - Steps 1-8 */}
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, index) => {
              const track = getCurrentTrack();
              const isActive = track?.steps[index] || false;
              const isCurrentStep = index === currentStep && isPlaying;
              const isBeatMarker = [0, 4].includes(index); // Beat markers for first row
              
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => track && toggleStep(track.id, index)}
                    className={`
                      mobile-pad aspect-square w-full transition-all
                      ${isActive ? 'active' : ''}
                      ${isCurrentStep ? 'playing' : ''}
                    `}
                  >
                    <img 
                      src={isActive ? '/ui-elements/pads/pad_on_2.png' : '/ui-elements/pads/pad_off_2.png'}
                      alt={`Pad ${index + 1}`}
                      className="pointer-events-none"
                      onError={(e) => {
                        // Fallback if PNGs not found
                        const button = e.currentTarget.parentElement!;
                        button.style.background = isActive ? 'linear-gradient(145deg, #DB1215, #FF4444)' : 'linear-gradient(145deg, #e0e0e0, #f8f8f8)';
                        button.style.borderRadius = '8px';
                        button.style.border = '1px solid ' + (isActive ? '#DB1215' : '#d0d0d0');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                  {/* Step number - centered on pads */}
                  <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-mono pointer-events-none ${
                    isBeatMarker ? 'text-red-500 font-bold' : 'text-white font-bold'
                  }`}>
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Second Row - Steps 9-16 */}
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, index) => {
              const stepIndex = index + 8; // Steps 8-15 (0-indexed)
              const track = getCurrentTrack();
              const isActive = track?.steps[stepIndex] || false;
              const isCurrentStep = stepIndex === currentStep && isPlaying;
              const isBeatMarker = [0, 4].includes(index); // Beat markers for second row (steps 9 and 13)
              
              return (
                <div key={stepIndex} className="relative">
                  <button
                    onClick={() => track && toggleStep(track.id, stepIndex)}
                    className={`
                      mobile-pad aspect-square w-full transition-all
                      ${isActive ? 'active' : ''}
                      ${isCurrentStep ? 'playing' : ''}
                    `}
                  >
                    <img 
                      src={isActive ? '/ui-elements/pads/pad_on_2.png' : '/ui-elements/pads/pad_off_2.png'}
                      alt={`Pad ${stepIndex + 1}`}
                      className="pointer-events-none"
                      onError={(e) => {
                        // Fallback if PNGs not found
                        const button = e.currentTarget.parentElement!;
                        button.style.background = isActive ? 'linear-gradient(145deg, #DB1215, #FF4444)' : 'linear-gradient(145deg, #e0e0e0, #f8f8f8)';
                        button.style.borderRadius = '8px';
                        button.style.border = '1px solid ' + (isActive ? '#DB1215' : '#d0d0d0');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                  {/* Step number - centered on pads */}
                  <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-mono pointer-events-none ${
                    isBeatMarker ? 'text-red-500 font-bold' : 'text-white font-bold'
                  }`}>
                    {stepIndex + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Bottom Pattern Banks + Play/Stop Button - Fixed */}
      <div className="p-3 bg-white border-t border-gray-200" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        
        {/* Banks Label */}
        <h3 className="text-center text-sm font-bold text-gray-700 mb-2">BANKS</h3>
        
        {/* Pattern Banks Control - All in one row, same width as PLAY button */}
        {patternBanks.length > 0 && (
          <div className="w-full mb-6 flex items-center gap-2">
            {/* Pattern Bank Switches A-D */}
            {patternBanks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => loadPatternFromBank(bank.id)}
                className={`
                  flex-1 h-10 text-xs font-bold border-2 rounded transition-all
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
            <Select onValueChange={(toBankId) => copyPatternToBank(currentBankId, toBankId)}>
              <SelectTrigger className="flex-1 h-10 text-sm font-medium border-gray-300">
                <SelectValue placeholder="COPY" />
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
            }}>
              <SelectTrigger className="flex-1 h-10 text-sm font-medium border-gray-300">
                <SelectValue placeholder="CLEAR" />
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
        
        <button
          onClick={togglePlayback}
          className={`
            w-full h-14 font-bold rounded-lg transition-all text-white text-lg
            ${isPlaying 
              ? 'bg-red-600 active:bg-red-700' 
              : 'bg-gray-800 active:bg-gray-900'
            }
          `}
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
    </div>
  );
}