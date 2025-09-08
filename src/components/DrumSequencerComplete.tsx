// COMPLETE WORKING Drum Sequencer - Stable Playback + All Features
// Diese Version kombiniert den stabilen Scheduler mit allen Sample Pack Features

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DebugPanel from '@/components/debug/DebugPanel';

// Types
interface DrumSample {
  id: string;
  name: string;
  audioFile?: string;
  sampleType: 'audio' | 'synthesized';
  freq?: number;
  type?: OscillatorType;
  duration?: number;
}

interface DrumTrack {
  id: string;
  name: string;
  color: string;
  steps: boolean[];
  volume: number;
  selectedSampleId: string;
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

// Simple Audio Engine for pattern storage
class SimpleAudioEngine {
  private pattern: boolean[][] = [];
  private volumes: number[] = [];
  private selectedSamples: string[] = [];
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  
  initializeTracks(tracks: DrumTrack[]) {
    this.pattern = tracks.map(t => [...t.steps]);
    this.volumes = tracks.map(t => t.volume);
    this.selectedSamples = tracks.map(t => t.selectedSampleId);
  }
  
  setPattern(trackIndex: number, stepIndex: number, value: boolean) {
    if (!this.pattern[trackIndex]) {
      this.pattern[trackIndex] = new Array(16).fill(false);
    }
    this.pattern[trackIndex][stepIndex] = value;
  }
  
  updateVolume(trackIndex: number, volume: number) {
    this.volumes[trackIndex] = volume;
  }
  
  updateSelectedSample(trackIndex: number, sampleId: string) {
    this.selectedSamples[trackIndex] = sampleId;
  }
  
  getPattern(trackIndex: number): boolean[] {
    return this.pattern[trackIndex] || new Array(16).fill(false);
  }
  
  getVolume(trackIndex: number): number {
    return this.volumes[trackIndex] || 0.7;
  }
  
  getSelectedSample(trackIndex: number): string {
    return this.selectedSamples[trackIndex] || '';
  }
  
  getActiveTracksForStep(stepIndex: number): number[] {
    const active: number[] = [];
    this.pattern.forEach((track, idx) => {
      if (track && track[stepIndex]) {
        active.push(idx);
      }
    });
    return active;
  }
  
  setPlaying(playing: boolean) {
    this.isPlaying = playing;
  }
  
  setCurrentStep(step: number) {
    this.currentStep = step;
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  clearAllPatterns() {
    this.pattern = this.pattern.map(track => new Array(16).fill(false));
  }
}

// Global sample data
let AVAILABLE_SAMPLE_PACKS: any[] = [];
let SAMPLE_KITS: SampleKit[] = [];

const FOLDER_COLORS = [
  'neon-blue', 'neon-green', 'neon-pink', 'neon-cyan', 
  'neon-yellow', 'neon-purple', 'neon-orange', 'neon-red'
];

export default function DrumSequencerComplete() {
  // State
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPreloadingComplete, setIsPreloadingComplete] = useState(false);
  const [preloadingProgress, setPreloadingProgress] = useState(0);
  
  // Refs - STABLE references
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEngineRef = useRef(new SimpleAudioEngine());
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepIndexRef = useRef(0);
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  const tracksRef = useRef<DrumTrack[]>([]);
  const bpmRef = useRef(120);
  
  // Update refs when state changes
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  
  // Initialize
  useEffect(() => {
    const init = async () => {
      // Initialize Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Discover sample packs
      await discoverSamplePacks();
      
      // Load first pack
      if (AVAILABLE_SAMPLE_PACKS.length > 0) {
        const firstPack = AVAILABLE_SAMPLE_PACKS[0];
        setSelectedKit(firstPack.id);
        
        // Generate tracks based on pack structure
        const generatedTracks = await generateTracksFromPack(firstPack.id);
        setTracks(generatedTracks);
        audioEngineRef.current.initializeTracks(generatedTracks);
        
        // Start preloading
        await preloadSamples(generatedTracks, firstPack.id);
        setIsPreloadingComplete(true);
      }
      
      setIsInitialized(true);
    };
    
    init();
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);
  
  // Discover sample packs
  const discoverSamplePacks = async () => {
    try {
      const response = await fetch('/api/discover-packs');
      const data = await response.json();
      
      if (!data.error) {
        AVAILABLE_SAMPLE_PACKS = data.packs || [];
      }
    } catch (error) {
      console.log('Using default sample packs');
      // Fallback to hardcoded packs
      AVAILABLE_SAMPLE_PACKS = [
        { id: 'ill-will-vol-1', name: 'I.L.L. Will - Drumsound Pack Vol. 1' },
        { id: 'ill-will-vol-2', name: 'I.L.L. Will - Drumsound Pack Vol. 2' },
        { id: 'ill-will-vol-3', name: 'I.L.L. Will - Drumsound Pack Vol. 3' }
      ];
    }
    
    // Load pack structures
    for (const pack of AVAILABLE_SAMPLE_PACKS) {
      await loadPackStructure(pack.id);
    }
  };
  
  // Load pack structure - with CORRECT file names!
  const loadPackStructure = async (packId: string) => {
    const kit: SampleKit = {
      id: packId,
      name: packId.replace('ill-will-vol-', 'I.L.L. Will - Drumsound Pack Vol. '),
      description: 'Drum samples',
      samples: {},
      folderNames: {}
    };
    
    // Map packId to correct volume number
    const volNumber = packId.replace('ill-will-vol-', '');
    const packPath = `/sample-packs/I.L.L. Will - Drumsound Pack Vol. ${volNumber}`;
    
    // Define the actual structure with CORRECT file names
    const structure = [
      { type: 'kick', folder: '01-Kick Drums', filePrefix: 'Kick Drum' },
      { type: 'snare', folder: '02-Snares', filePrefix: 'Snare' },
      { type: 'rimshot', folder: '03-Rimshot', filePrefix: 'Rimshot' },
      { type: 'hihat', folder: '04-Hi-hats', filePrefix: 'Hi-hat' },
      { type: 'openhat', folder: '05-Open hi-hats', filePrefix: 'Open Hi-hat' },
      { type: 'ride', folder: '06-Ride', filePrefix: 'Ride' },
      { type: 'clap', folder: '07-Hand claps', filePrefix: 'Hand claps' },
      { type: 'perc', folder: '08-Various Percussions', filePrefix: 'Various Percussions' }
    ];
    
    structure.forEach(({ type, folder, filePrefix }) => {
      kit.samples[type] = [];
      kit.folderNames![type] = folder;
      
      // Add first 4 samples for each type
      for (let i = 1; i <= 4; i++) {
        const fileName = `${filePrefix} ${i}.wav`;
        const fullPath = `${packPath}/${folder}/${fileName}`;
        
        kit.samples[type].push({
          id: `${type}-${i}`,
          name: `${filePrefix} ${i}`,
          audioFile: fullPath,
          sampleType: 'audio'
        });
      }
    });
    
    console.log(`📦 Loaded kit structure for ${kit.name}`);
    SAMPLE_KITS.push(kit);
  };
  
  // Generate tracks from pack
  const generateTracksFromPack = async (packId: string): Promise<DrumTrack[]> => {
    const kit = SAMPLE_KITS.find(k => k.id === packId);
    if (!kit) return [];
    
    const generatedTracks: DrumTrack[] = [];
    let colorIndex = 0;
    
    Object.entries(kit.samples).forEach(([drumType, samples]) => {
      if (samples.length > 0) {
        generatedTracks.push({
          id: drumType,
          name: kit.folderNames?.[drumType] || drumType,
          color: FOLDER_COLORS[colorIndex % FOLDER_COLORS.length],
          steps: new Array(16).fill(false),
          volume: 0.7,
          selectedSampleId: samples[0].id
        });
        colorIndex++;
      }
    });
    
    return generatedTracks.slice(0, 8); // Limit to 8 tracks
  };
  
  // Preload samples
  const preloadSamples = async (tracks: DrumTrack[], kitId: string) => {
    const kit = SAMPLE_KITS.find(k => k.id === kitId);
    if (!kit) return;
    
    let loaded = 0;
    const total = tracks.length;
    
    for (const track of tracks) {
      const samples = kit.samples[track.id];
      if (samples && samples.length > 0) {
        const sample = samples[0];
        if (sample.audioFile) {
          try {
            await loadAudioSample(sample.audioFile);
            loaded++;
            setPreloadingProgress((loaded / total) * 100);
          } catch (error) {
            console.warn(`Failed to preload ${sample.audioFile}`);
          }
        }
      }
    }
  };
  
  // Load audio sample
  const loadAudioSample = async (audioFile: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    
    // Check cache
    if (sampleCacheRef.current[audioFile]) {
      console.log(`✅ Using cached sample: ${audioFile}`);
      return sampleCacheRef.current[audioFile];
    }
    
    try {
      console.log(`🎵 Loading sample: ${audioFile}`);
      const response = await fetch(audioFile);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Cache it
      sampleCacheRef.current[audioFile] = audioBuffer;
      console.log(`✅ Loaded and cached: ${audioFile} (${audioBuffer.duration.toFixed(2)}s)`);
      return audioBuffer;
    } catch (error) {
      console.error(`❌ Failed to load ${audioFile}:`, error);
      return null;
    }
  };
  
  // CRITICAL: Stable scheduler callback - THE KEY TO STABLE PLAYBACK!
  const runScheduler = useCallback(() => {
    if (!audioContextRef.current || !schedulerIntervalRef.current) return;
    
    const ctx = audioContextRef.current;
    const stepDuration = 60 / bpmRef.current / 4; // Use ref for BPM
    const scheduleAheadTime = 0.1;
    
    // Schedule upcoming steps
    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const stepToSchedule = currentStepIndexRef.current;
      const timeToSchedule = nextStepTimeRef.current;
      
      // Get active tracks from engine
      const activeTracks = audioEngineRef.current.getActiveTracksForStep(stepToSchedule);
      
      // Play each active track
      activeTracks.forEach(trackIndex => {
        if (tracksRef.current[trackIndex]) {
          const track = tracksRef.current[trackIndex];
          playSound(track, trackIndex, timeToSchedule);
        }
      });
      
      // Update visual step
      const delay = Math.max(0, (timeToSchedule - ctx.currentTime) * 1000);
      setTimeout(() => {
        setCurrentStep(stepToSchedule);
        audioEngineRef.current.setCurrentStep(stepToSchedule);
      }, delay);
      
      // Advance
      nextStepTimeRef.current += stepDuration;
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
  }, []); // NO DEPENDENCIES! This is crucial!
  
  // Start/stop scheduler - ONLY depends on isPlaying
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      // Initialize timing
      if (nextStepTimeRef.current === 0) {
        nextStepTimeRef.current = audioContextRef.current.currentTime;
        currentStepIndexRef.current = 0;
      }
      
      // Start scheduler with stable callback
      schedulerIntervalRef.current = setInterval(runScheduler, 25);
      audioEngineRef.current.setPlaying(true);
    } else {
      // Stop scheduler
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
        schedulerIntervalRef.current = null;
      }
      nextStepTimeRef.current = 0;
      currentStepIndexRef.current = 0;
      audioEngineRef.current.setPlaying(false);
    }
    
    return () => {
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
    };
  }, [isPlaying, runScheduler]); // Stable dependencies
  
  // Play sound with real samples
  const playSound = useCallback((track: DrumTrack, trackIndex: number, time: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const kit = SAMPLE_KITS.find(k => k.id === selectedKit);
    
    if (kit) {
      const samples = kit.samples[track.id];
      const selectedSampleId = audioEngineRef.current.getSelectedSample(trackIndex);
      const sample = samples?.find(s => s.id === selectedSampleId) || samples?.[0];
      
      if (sample?.audioFile && sampleCacheRef.current[sample.audioFile]) {
        // Play real sample
        console.log(`🔊 Playing cached sample: ${sample.name}`);
        const audioBuffer = sampleCacheRef.current[sample.audioFile];
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();
        
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        gainNode.gain.value = audioEngineRef.current.getVolume(trackIndex);
        
        source.start(time);
      } else {
        // Fallback to synthesized sound
        console.log(`🎹 Playing synth for ${track.id} (no sample loaded)`);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const freqs: { [key: string]: number } = {
          'kick': 60, 'snare': 200, 'hihat': 8000, 'openhat': 6000,
          'rimshot': 300, 'clap': 1000, 'ride': 4000, 'perc': 500
        };
        
        osc.frequency.value = freqs[track.id] || 440;
        gain.gain.value = audioEngineRef.current.getVolume(trackIndex) * 0.3;
        
        osc.start(time);
        osc.stop(time + 0.1);
      }
    }
  }, [selectedKit]);
  
  // Toggle step - STABLE callback
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentValue = audioEngineRef.current.getPattern(trackIndex)[stepIndex];
    const newValue = !currentValue;
    
    // Update engine immediately
    audioEngineRef.current.setPattern(trackIndex, stepIndex, newValue);
    
    // Update UI
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, steps: track.steps.map((s, i) => i === stepIndex ? newValue : s) }
        : track
    ));
  }, []);
  
  // Volume control - STABLE
  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      audioEngineRef.current.updateVolume(trackIndex, volume / 100);
    }
    
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, volume: volume / 100 } : track
    ));
  }, []);
  
  // Sample selection - STABLE
  const updateTrackSample = useCallback((trackId: string, sampleId: string) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex !== -1) {
      audioEngineRef.current.updateSelectedSample(trackIndex, sampleId);
    }
    
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, selectedSampleId: sampleId } : track
    ));
  }, []);
  
  // Playback controls - STABLE
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);
  
  const clearPattern = useCallback(() => {
    audioEngineRef.current.clearAllPatterns();
    setTracks(prev => prev.map(track => ({
      ...track,
      steps: new Array(16).fill(false)
    })));
  }, []);
  
  // Kit switching
  const switchKit = useCallback(async (kitId: string) => {
    setSelectedKit(kitId);
    setIsPlaying(false);
    setCurrentStep(0);
    
    const newTracks = await generateTracksFromPack(kitId);
    setTracks(newTracks);
    audioEngineRef.current.initializeTracks(newTracks);
    
    setIsPreloadingComplete(false);
    await preloadSamples(newTracks, kitId);
    setIsPreloadingComplete(true);
  }, []);
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">Loading Drum Sequencer...</h2>
          <p className="text-muted-foreground">Discovering sample packs...</p>
        </div>
      </div>
    );
  }
  
  if (!isPreloadingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-2">Loading Samples...</h2>
          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto mt-4">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${preloadingProgress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{Math.round(preloadingProgress)}%</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-background text-foreground min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Groove Forge Drum Sequencer
            </h1>
            <p className="text-muted-foreground">Stable Playback + All Features</p>
          </div>
          
          {/* Sample Pack Selector */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm font-medium">Sample Pack:</span>
            <Select value={selectedKit} onValueChange={switchKit}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_SAMPLE_PACKS.map(pack => (
                  <SelectItem key={pack.id} value={pack.id}>
                    {pack.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => setIsDarkMode(!isDarkMode)}
              size="icon"
              variant="outline"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-4 p-6 bg-card rounded-xl">
            <Button
              onClick={togglePlayback}
              size="lg"
              variant={isPlaying ? "destructive" : "default"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </Button>
            
            <Button onClick={stopPlayback} size="lg" variant="outline">
              <Square className="w-5 h-5" />
              STOP
            </Button>
            
            <Button onClick={clearPattern} size="lg" variant="outline">
              <RotateCcw className="w-5 h-5" />
              CLEAR
            </Button>
            
            <div className="flex items-center gap-2 ml-8">
              <span>BPM</span>
              <Slider
                value={[bpm]}
                onValueChange={(v) => setBpm(v[0])}
                min={60}
                max={180}
                className="w-32"
              />
              <span className="w-12 text-right font-mono">{bpm}</span>
            </div>
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`w-6 sm:w-8 h-2 rounded transition-all ${
                  i === currentStep && isPlaying
                    ? 'bg-green-500 shadow-lg shadow-green-500/50'
                    : i % 4 === 0
                    ? 'bg-blue-500/30'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          
          {/* Drum Tracks */}
          <div className="space-y-4">
            {tracks.map((track, trackIndex) => {
              const kit = SAMPLE_KITS.find(k => k.id === selectedKit);
              const samples = kit?.samples[track.id] || [];
              
              return (
                <div key={track.id} className="bg-card rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h3 className="text-lg font-semibold w-32">{track.name}</h3>
                    
                    <div className="flex items-center gap-4 flex-1">
                      {/* Sample Selector */}
                      <Select
                        value={track.selectedSampleId}
                        onValueChange={(value) => updateTrackSample(track.id, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {samples.map(sample => (
                            <SelectItem key={sample.id} value={sample.id}>
                              {sample.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Volume Control */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm">VOL</span>
                        <Slider
                          value={[track.volume * 100]}
                          onValueChange={(v) => updateTrackVolume(track.id, v[0])}
                          min={0}
                          max={100}
                          className="w-32"
                        />
                        <span className="text-sm w-12 text-right">{Math.round(track.volume * 100)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step Buttons */}
                  <div className="grid grid-cols-16 gap-1 sm:gap-2">
                    {track.steps.map((isActive, stepIndex) => (
                      <button
                        key={stepIndex}
                        onClick={() => toggleStep(track.id, stepIndex)}
                        className={`
                          aspect-square rounded-lg border-2 transition-all
                          ${isActive
                            ? `bg-${track.color}/80 border-${track.color} shadow-lg`
                            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                          }
                          ${stepIndex === currentStep && isPlaying
                            ? 'scale-110 ring-2 ring-white/50'
                            : ''
                          }
                          ${stepIndex % 4 === 0 ? 'border-l-4' : ''}
                        `}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="text-center text-muted-foreground">
            <p>Click pads to program • Playback stays stable during editing!</p>
          </div>
        </div>
        
        <DebugPanel
          isPlaying={isPlaying}
          currentStep={currentStep}
          bpm={bpm}
          tracks={tracks}
          audioEngine={audioEngineRef.current}
        />
      </div>
    </div>
  );
}
