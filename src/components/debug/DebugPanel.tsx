// Debug Helper Component für den Drum Sequenzer
// Zeigt alle wichtigen State-Variablen und Events an

import { useEffect, useState } from 'react';

interface DebugPanelProps {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  tracks: any[];
  audioEngine: any;
}

export default function DebugPanel({ isPlaying, currentStep, bpm, tracks, audioEngine }: DebugPanelProps) {
  const [events, setEvents] = useState<string[]>([]);
  const [renderCount, setRenderCount] = useState(0);

  // Track render counts
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [tracks, isPlaying, currentStep, bpm]);

  // Log events
  const logEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      fractionalSecondDigits: 3 
    });
    setEvents(prev => [`[${timestamp}] ${event}`, ...prev].slice(0, 20));
  };

  // Monitor state changes
  useEffect(() => {
    logEvent(`isPlaying changed to: ${isPlaying}`);
  }, [isPlaying]);

  useEffect(() => {
    logEvent(`Tracks updated - ${tracks.length} tracks`);
  }, [tracks]);

  useEffect(() => {
    logEvent(`BPM changed to: ${bpm}`);
  }, [bpm]);

  // Monitor audio engine state
  useEffect(() => {
    if (audioEngine) {
      const interval = setInterval(() => {
        const enginePlaying = audioEngine.getIsPlaying();
        const engineStep = audioEngine.getCurrentStep();
        
        // Only log if there's a mismatch
        if (enginePlaying !== isPlaying) {
          logEvent(`⚠️ STATE MISMATCH: React isPlaying=${isPlaying}, Engine=${enginePlaying}`);
        }
        if (engineStep !== currentStep && isPlaying) {
          logEvent(`⚠️ STEP MISMATCH: React step=${currentStep}, Engine=${engineStep}`);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [audioEngine, isPlaying, currentStep]);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs max-w-md z-50 border border-green-400/30">
      <h3 className="text-sm font-bold mb-2 text-green-500">🐛 Debug Panel</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <span className="text-gray-400">Playing:</span> 
          <span className={isPlaying ? 'text-green-400' : 'text-red-400'}>
            {isPlaying ? '▶️ YES' : '⏸️ NO'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Step:</span> {currentStep + 1}/16
        </div>
        <div>
          <span className="text-gray-400">BPM:</span> {bpm}
        </div>
        <div>
          <span className="text-gray-400">Tracks:</span> {tracks.length}
        </div>
        <div>
          <span className="text-gray-400">Renders:</span> {renderCount}
        </div>
        <div>
          <span className="text-gray-400">Engine:</span> 
          {audioEngine ? '✅' : '❌'}
        </div>
      </div>

      <div className="border-t border-green-400/30 pt-2">
        <h4 className="text-xs text-gray-400 mb-1">Event Log:</h4>
        <div className="h-32 overflow-y-auto space-y-0.5">
          {events.map((event, idx) => (
            <div key={idx} className="text-[10px] text-gray-300">
              {event}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
