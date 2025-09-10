/**
 * Mobile Performance Monitor - Real-time stats overlay
 * Shows cache performance, memory usage, and audio health
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PerformanceStats {
  cacheSize: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  memoryUsageMB: number;
  activeSources: number;
  scheduledEvents: number;
  audioLatency: number;
  fps: number;
}

interface MobilePerformanceMonitorProps {
  getStats: () => PerformanceStats;
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function MobilePerformanceMonitor({ 
  getStats, 
  isVisible = false,
  position = 'bottom-right' 
}: MobilePerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    cacheSize: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    memoryUsageMB: 0,
    activeSources: 0,
    scheduledEvents: 0,
    audioLatency: 0,
    fps: 60
  });
  
  const [lastFrameTime, setLastFrameTime] = useState(performance.now());
  
  useEffect(() => {
    if (!isVisible) return;
    
    let animationFrame: number;
    
    const updateStats = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTime;
      const currentFps = Math.round(1000 / deltaTime);
      setLastFrameTime(now);
      
      const newStats = getStats();
      setStats({
        ...newStats,
        fps: currentFps
      });
      
      animationFrame = requestAnimationFrame(updateStats);
    };
    
    animationFrame = requestAnimationFrame(updateStats);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, getStats, lastFrameTime]);
  
  if (!isVisible) return null;
  
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2'
  };
  
  const getHealthColor = (value: number, type: 'hitRate' | 'memory' | 'fps') => {
    switch(type) {
      case 'hitRate':
        if (value >= 0.8) return 'text-green-400';
        if (value >= 0.5) return 'text-yellow-400';
        return 'text-red-400';
      case 'memory':
        if (value <= 50) return 'text-green-400';
        if (value <= 100) return 'text-yellow-400';
        return 'text-red-400';
      case 'fps':
        if (value >= 50) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };
  
  return (
    <div 
      className={cn(
        "fixed z-50 bg-black/90 backdrop-blur-sm rounded-lg p-3 font-mono text-xs text-white",
        "shadow-xl border border-white/10",
        "min-w-[200px]",
        positionClasses[position]
      )}
    >
      <div className="space-y-1">
        <div className="font-bold text-white/80 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          PERFORMANCE
        </div>
        
        {/* Cache Stats */}
        <div className="border-t border-white/10 pt-1">
          <div className="text-white/60 mb-1">CACHE</div>
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{stats.cacheSize} samples</span>
          </div>
          <div className="flex justify-between">
            <span>Hit Rate:</span>
            <span className={getHealthColor(stats.hitRate, 'hitRate')}>
              {(stats.hitRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-white/40 text-[10px]">
            <span>H:{stats.cacheHits}</span>
            <span>M:{stats.cacheMisses}</span>
          </div>
        </div>
        
        {/* Memory Stats */}
        <div className="border-t border-white/10 pt-1">
          <div className="text-white/60 mb-1">MEMORY</div>
          <div className="flex justify-between">
            <span>Usage:</span>
            <span className={getHealthColor(stats.memoryUsageMB, 'memory')}>
              {stats.memoryUsageMB.toFixed(1)} MB
            </span>
          </div>
        </div>
        
        {/* Audio Stats */}
        <div className="border-t border-white/10 pt-1">
          <div className="text-white/60 mb-1">AUDIO</div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span>{stats.activeSources} sources</span>
          </div>
          <div className="flex justify-between">
            <span>Scheduled:</span>
            <span>{stats.scheduledEvents} events</span>
          </div>
        </div>
        
        {/* Performance */}
        <div className="border-t border-white/10 pt-1">
          <div className="flex justify-between">
            <span>FPS:</span>
            <span className={getHealthColor(stats.fps, 'fps')}>
              {stats.fps}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}