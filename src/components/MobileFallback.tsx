/**
 * Mobile Fallback Component - Simple Drum Pattern Player
 * Fallback for when sample discovery fails on mobile/production
 */

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SimpleDrum {
  id: string;
  name: string;
  url: string;
  color: string;
}

// Fallback drums using basic samples or synthesized sounds
const FALLBACK_DRUMS: SimpleDrum[] = [
  { id: 'kick', name: 'Kick', url: '', color: 'neon-red' },
  { id: 'snare', name: 'Snare', url: '', color: 'neon-blue' },
  { id: 'hihat', name: 'Hi-Hat', url: '', color: 'neon-green' },
  { id: 'openhat', name: 'Open Hat', url: '', color: 'neon-yellow' },
  { id: 'crash', name: 'Crash', url: '', color: 'neon-purple' },
  { id: 'ride', name: 'Ride', url: '', color: 'neon-cyan' },
];

export default function MobileFallback() {
  const [patterns, setPatterns] = useState<{[key: string]: boolean[]}>({
    kick: new Array(16).fill(false),
    snare: new Array(16).fill(false), 
    hihat: new Array(16).fill(false),
    openhat: new Array(16).fill(false),
    crash: new Array(16).fill(false),
    ride: new Array(16).fill(false),
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(120);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Simple step toggle
  const toggleStep = useCallback((drumId: string, stepIndex: number) => {
    setPatterns(prev => ({
      ...prev,
      [drumId]: prev[drumId].map((step, i) => 
        i === stepIndex ? !step : step
      )
    }));
  }, []);

  // Simple synthesized drum sounds for fallback
  const playDrumSound = useCallback((drumId: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Simple synthesized percussion sounds
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    // Different frequencies for different drums
    switch (drumId) {
      case 'kick':
        oscillator.frequency.setValueAtTime(60, now);
        oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;
      case 'snare':
        oscillator.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'hihat':
        oscillator.frequency.setValueAtTime(8000, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        break;
      default:
        oscillator.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    }
    
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }, []);

  // Simple playback
  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      // Stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      // Start
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      setIsPlaying(true);
      
      const stepInterval = (60 / bpm / 4) * 1000; // 16th notes in ms
      
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          const nextStep = (prev + 1) % 16;
          
          // Play active drums for current step
          FALLBACK_DRUMS.forEach(drum => {
            if (patterns[drum.id] && patterns[drum.id][prev]) {
              playDrumSound(drum.id);
            }
          });
          
          return nextStep;
        });
      }, stepInterval);
    }
  }, [isPlaying, bpm, patterns, playDrumSound]);

  // Clear pattern
  const handleClear = useCallback(() => {
    setPatterns(prev => {
      const cleared = { ...prev };
      Object.keys(cleared).forEach(key => {
        cleared[key] = new Array(16).fill(false);
      });
      return cleared;
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-4">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">SoundAngeles Drum Sequencer</h1>
          <p className="text-gray-400">Mobile/Fallback Mode</p>
        </div>

        {/* Transport Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePlay}
            className={cn(
              "px-6 py-3",
              isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            )}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {isPlaying ? "Stop" : "Play"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClear}
            className="px-6 py-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* BPM Control */}
        <div className="mb-6 text-center">
          <label className="block text-sm font-medium mb-2">BPM: {bpm}</label>
          <input
            type="range"
            min="80"
            max="160"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-32"
          />
        </div>

        {/* Step Sequencer Grid */}
        <div className="space-y-2">
          {FALLBACK_DRUMS.map((drum) => (
            <div key={drum.id} className="flex items-center gap-2">
              <div className="w-16 text-sm font-medium">
                {drum.name}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 16 }, (_, stepIndex) => (
                  <button
                    key={stepIndex}
                    onClick={() => toggleStep(drum.id, stepIndex)}
                    className={cn(
                      "w-8 h-8 rounded border-2 transition-all duration-150",
                      patterns[drum.id][stepIndex]
                        ? `bg-${drum.color} border-${drum.color} shadow-lg shadow-${drum.color}/50`
                        : "bg-gray-800 border-gray-600 hover:border-gray-400",
                      currentStep === stepIndex && isPlaying
                        ? "ring-2 ring-white"
                        : ""
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Current Step Indicator */}
        {isPlaying && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Step: {currentStep + 1} / 16
          </div>
        )}
        
        <div className="mt-6 text-center text-xs text-gray-500">
          Simplified version for mobile devices<br/>
          Using synthesized drum sounds
        </div>
      </div>
    </div>
  );
}