// TRULY FIXED Drum Sequencer - mit stabilem Scheduler
// Dieser Code sollte das Playback-Stop-Problem endgültig lösen

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Square, RotateCcw, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DebugPanel from '@/components/debug/DebugPanel';

// Import existing types and sample data
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

// Super simple Audio Engine that just stores pattern data
class SimpleAudioEngine {
  private pattern: boolean[][] = [];
  
  setPattern(trackIndex: number, stepIndex: number, value: boolean) {
    if (!this.pattern[trackIndex]) {
      this.pattern[trackIndex] = new Array(16).fill(false);
    }
    this.pattern[trackIndex][stepIndex] = value;
  }
  
  getPattern(trackIndex: number): boolean[] {
    return this.pattern[trackIndex] || new Array(16).fill(false);
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
}

export default function DrumSequencerReallyFixed() {
  // State
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs - these are STABLE and don't cause re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEngineRef = useRef(new SimpleAudioEngine());
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepIndexRef = useRef(0);
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  
  // CRITICAL: Store tracks in a ref that updates WITHOUT triggering effects
  const tracksRef = useRef<DrumTrack[]>([]);
  
  // Update tracksRef when tracks change - but DON'T trigger other effects
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  
  // Initialize once
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const initialTracks: DrumTrack[] = [
      { id: 'kick', name: 'Kick', color: 'blue', steps: new Array(16).fill(false), volume: 0.7, selectedSampleId: 'kick1' },
      { id: 'snare', name: 'Snare', color: 'green', steps: new Array(16).fill(false), volume: 0.7, selectedSampleId: 'snare1' },
      { id: 'hihat', name: 'Hi-Hat', color: 'cyan', steps: new Array(16).fill(false), volume: 0.7, selectedSampleId: 'hihat1' },
    ];
    
    setTracks(initialTracks);
    setIsInitialized(true);
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);
  
  // CRITICAL FIX: Define scheduler function OUTSIDE useEffect as a stable callback
  const runScheduler = useCallback(() => {
    if (!audioContextRef.current || !schedulerIntervalRef.current) return;
    
    const ctx = audioContextRef.current;
    const stepDuration = 60 / bpm / 4;
    const scheduleAheadTime = 0.1;
    
    // Schedule upcoming steps
    while (nextStepTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const stepToSchedule = currentStepIndexRef.current;
      const timeToSchedule = nextStepTimeRef.current;
      
      // Get active tracks for this step from the audio engine
      const activeTracks = audioEngineRef.current.getActiveTracksForStep(stepToSchedule);
      
      // Schedule each active track
      activeTracks.forEach(trackIndex => {
        if (tracksRef.current[trackIndex]) {
          playSound(tracksRef.current[trackIndex], timeToSchedule);
        }
      });
      
      // Schedule visual update
      const delay = Math.max(0, (timeToSchedule - ctx.currentTime) * 1000);
      setTimeout(() => {
        setCurrentStep(stepToSchedule);
      }, delay);
      
      // Advance to next step
      nextStepTimeRef.current += stepDuration;
      currentStepIndexRef.current = (currentStepIndexRef.current + 1) % 16;
    }
  }, [bpm]); // Only depends on BPM
  
  // Start/stop scheduler - ONLY depends on isPlaying
  useEffect(() => {
    if (isPlaying && audioContextRef.current) {
      // Initialize timing
      if (nextStepTimeRef.current === 0) {
        nextStepTimeRef.current = audioContextRef.current.currentTime;
        currentStepIndexRef.current = 0;
      }
      
      // Start scheduler - use the STABLE callback
      schedulerIntervalRef.current = setInterval(runScheduler, 25);
    } else {
      // Stop scheduler
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
  }, [isPlaying, runScheduler]); // Dependencies are STABLE
  
  // Play sound - simple version for testing
  const playSound = useCallback((track: DrumTrack, time: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Different sounds for different tracks
    const freqs: { [key: string]: number } = {
      'kick': 60,
      'snare': 200,
      'hihat': 8000
    };
    
    osc.frequency.value = freqs[track.id] || 440;
    gain.gain.value = track.volume * 0.3;
    
    osc.start(time);
    osc.stop(time + 0.1);
  }, []);
  
  // Toggle step - updates BOTH engine and UI
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    const trackIndex = tracksRef.current.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    // Get current value from engine
    const currentValue = audioEngineRef.current.getPattern(trackIndex)[stepIndex];
    const newValue = !currentValue;
    
    // Update engine IMMEDIATELY
    audioEngineRef.current.setPattern(trackIndex, stepIndex, newValue);
    
    // Update UI state
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, steps: track.steps.map((s, i) => i === stepIndex ? newValue : s) }
        : track
    ));
  }, []);
  
  // Playback controls
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);
  
  const clearPattern = useCallback(() => {
    // Clear engine
    tracks.forEach((_, trackIndex) => {
      for (let i = 0; i < 16; i++) {
        audioEngineRef.current.setPattern(trackIndex, i, false);
      }
    });
    
    // Clear UI
    setTracks(prev => prev.map(track => ({
      ...track,
      steps: new Array(16).fill(false)
    })));
  }, [tracks]);
  
  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, volume: volume / 100 } : track
    ));
  }, []);
  
  if (!isInitialized) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Drum Sequencer (REALLY Fixed)</h1>
          <p className="text-muted-foreground">This version should not stop when clicking pads!</p>
        </div>
        
        {/* Transport */}
        <div className="flex items-center justify-center gap-4 p-6 bg-card rounded-xl">
          <Button onClick={togglePlayback} size="lg" variant={isPlaying ? "destructive" : "default"}>
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
            <span className="w-12">{bpm}</span>
          </div>
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded ${
                i === currentStep && isPlaying
                  ? 'bg-green-500 shadow-lg'
                  : i % 4 === 0
                  ? 'bg-blue-500/30'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        
        {/* Tracks */}
        <div className="space-y-4">
          {tracks.map((track, trackIndex) => (
            <div key={track.id} className="bg-card rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold w-24">{track.name}</h3>
                <div className="flex items-center gap-2">
                  <span>VOL</span>
                  <Slider
                    value={[track.volume * 100]}
                    onValueChange={(v) => updateTrackVolume(track.id, v[0])}
                    min={0}
                    max={100}
                    className="w-32"
                  />
                  <span className="w-12">{Math.round(track.volume * 100)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-16 gap-2">
                {track.steps.map((isActive, stepIndex) => (
                  <button
                    key={stepIndex}
                    onClick={() => toggleStep(track.id, stepIndex)}
                    className={`
                      aspect-square rounded-lg border-2 transition-all
                      ${isActive
                        ? `bg-${track.color}-500/80 border-${track.color}-400 shadow-lg`
                        : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                      }
                      ${stepIndex === currentStep && isPlaying
                        ? 'scale-110 ring-2 ring-white/50'
                        : ''
                      }
                    `}
                  />
                ))}
              </div>
            </div>
          ))}
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
  );
}
