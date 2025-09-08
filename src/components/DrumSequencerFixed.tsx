// FIXED Drum Sequencer - Playback bleibt stabil
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types bleiben gleich
interface DrumSample {
  id: string;
  name: string;
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
}

// Simplified Audio Engine für stabiles Playback
class AudioEngine {
  private pattern: boolean[][] = [];
  private volumes: number[] = [];
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  
  updatePattern(trackIndex: number, stepIndex: number, value: boolean) {
    if (!this.pattern[trackIndex]) {
      this.pattern[trackIndex] = new Array(16).fill(false);
    }
    this.pattern[trackIndex][stepIndex] = value;
  }
  
  updateVolume(trackIndex: number, volume: number) {
    this.volumes[trackIndex] = volume;
  }
  
  setPlaying(playing: boolean) {
    this.isPlaying = playing;
  }
  
  setCurrentStep(step: number) {
    this.currentStep = step;
  }
  
  getPattern(trackIndex: number): boolean[] {
    return this.pattern[trackIndex] || new Array(16).fill(false);
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  getActiveTracksForStep(stepIndex: number): number[] {
    const activeTracks: number[] = [];
    this.pattern.forEach((track, trackIndex) => {
      if (track && track[stepIndex]) {
        activeTracks.push(trackIndex);
      }
    });
    return activeTracks;
  }
}

export default function DrumSequencer() {
  // State
  const [tracks, setTracks] = useState<DrumTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  
  // Refs für stabiles Playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const isPlayingRef = useRef(false);
  const schedulerRef = useRef<NodeJS.Timeout | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const sampleCacheRef = useRef<{ [key: string]: AudioBuffer }>({});
  
  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  // Initialize Audio Context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Initialize default tracks
    const defaultTracks: DrumTrack[] = [
      {
        id: 'kick',
        name: 'Kick',
        color: 'neon-blue',
        steps: new Array(16).fill(false),
        volume: 0.7,
        selectedSampleId: 'kick-1'
      },
      {
        id: 'snare', 
        name: 'Snare',
        color: 'neon-green',
        steps: new Array(16).fill(false),
        volume: 0.7,
        selectedSampleId: 'snare-1'
      },
      {
        id: 'hihat',
        name: 'Hi-Hat',
        color: 'neon-cyan',
        steps: new Array(16).fill(false),
        volume: 0.7,
        selectedSampleId: 'hihat-1'
      }
    ];
    
    setTracks(defaultTracks);
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);
  
  // Scheduler für Playback - STABIL ohne Re-Render Probleme
  useEffect(() => {
    if (!isPlaying || !audioContextRef.current) {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
      nextStepTimeRef.current = 0;
      currentStepRef.current = 0;
      return;
    }
    
    const ctx = audioContextRef.current;
    const stepDuration = 60 / bpm / 4; // 16th notes
    
    if (nextStepTimeRef.current === 0) {
      nextStepTimeRef.current = ctx.currentTime;
    }
    
    const scheduler = () => {
      if (!isPlayingRef.current) return;
      
      while (nextStepTimeRef.current < ctx.currentTime + 0.1) {
        // Schedule sounds
        const activeTracks = audioEngineRef.current.getActiveTracksForStep(currentStepRef.current);
        activeTracks.forEach(trackIndex => {
          playSound(tracks[trackIndex], nextStepTimeRef.current);
        });
        
        // Update step
        const step = currentStepRef.current;
        setTimeout(() => {
          if (isPlayingRef.current) {
            setCurrentStep(step);
            audioEngineRef.current.setCurrentStep(step);
          }
        }, Math.max(0, (nextStepTimeRef.current - ctx.currentTime) * 1000));
        
        // Advance
        nextStepTimeRef.current += stepDuration;
        currentStepRef.current = (currentStepRef.current + 1) % 16;
      }
    };
    
    schedulerRef.current = setInterval(scheduler, 25);
    
    return () => {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
      }
    };
  }, [isPlaying, bpm, tracks]);
  
  // Play sound function
  const playSound = useCallback((track: DrumTrack, time: number) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Simple oscillator sound for testing
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different frequencies for different drums
    const frequencies: { [key: string]: number } = {
      'kick': 60,
      'snare': 200,
      'hihat': 8000
    };
    
    oscillator.frequency.value = frequencies[track.id] || 440;
    gainNode.gain.value = track.volume * 0.3;
    
    oscillator.start(time);
    oscillator.stop(time + 0.1);
  }, []);
  
  // WICHTIG: Callbacks mit useCallback für stabile Referenzen
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentValue = audioEngineRef.current.getPattern(trackIndex)[stepIndex];
    const newValue = !currentValue;
    
    // Update Audio Engine
    audioEngineRef.current.updatePattern(trackIndex, stepIndex, newValue);
    
    // Update React State
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, steps: track.steps.map((step, idx) => idx === stepIndex ? newValue : step) }
        : track
    ));
  }, [tracks]);
  
  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const normalizedVolume = volume / 100;
    
    // Update Audio Engine
    audioEngineRef.current.updateVolume(trackIndex, normalizedVolume);
    
    // Update React State
    setTracks(prev => prev.map(track =>
      track.id === trackId ? { ...track, volume: normalizedVolume } : track
    ));
  }, [tracks]);
  
  const togglePlayback = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    audioEngineRef.current.setPlaying(newState);
    
    if (newState) {
      setCurrentStep(0);
      audioEngineRef.current.setCurrentStep(0);
    }
  }, [isPlaying]);
  
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    audioEngineRef.current.setPlaying(false);
    setCurrentStep(0);
    audioEngineRef.current.setCurrentStep(0);
  }, []);
  
  const clearPattern = useCallback(() => {
    setTracks(prev => prev.map(track => ({
      ...track,
      steps: new Array(16).fill(false)
    })));
    
    // Clear audio engine patterns
    tracks.forEach((_, index) => {
      for (let step = 0; step < 16; step++) {
        audioEngineRef.current.updatePattern(index, step, false);
      }
    });
  }, [tracks]);
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Drum Sequencer</h1>
          <p className="text-muted-foreground">Click pads to create your beat</p>
        </div>
        
        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-4 p-6 bg-card rounded-xl">
          <Button
            onClick={togglePlayback}
            variant={isPlaying ? "destructive" : "default"}
            size="lg"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </Button>
          
          <Button onClick={stopPlayback} variant="outline" size="lg">
            <Square className="w-5 h-5" />
            STOP
          </Button>
          
          <Button onClick={clearPattern} variant="outline" size="lg">
            <RotateCcw className="w-5 h-5" />
            CLEAR
          </Button>
          
          <div className="flex items-center gap-2 ml-8">
            <span>BPM</span>
            <Slider
              value={[bpm]}
              onValueChange={(value) => setBpm(value[0])}
              min={60}
              max={180}
              step={1}
              className="w-32"
            />
            <span className="w-12 text-right">{bpm}</span>
          </div>
        </div>
        
        {/* Step Indicators */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded ${
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
          {tracks.map((track, trackIndex) => (
            <div key={track.id} className="bg-card rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold w-24">{track.name}</h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">VOL</span>
                  <Slider
                    value={[track.volume * 100]}
                    onValueChange={(value) => updateTrackVolume(track.id, value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="w-32"
                  />
                  <span className="text-sm w-12">{Math.round(track.volume * 100)}</span>
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
                        ? `bg-${track.color}/80 border-${track.color} shadow-lg`
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
    </div>
  );
}
