/**
 * Adaptive Mobile Integration Component v7.3.5
 * Integrates comprehensive mobile optimization for ALL low-power devices
 * Integrates with existing lazy loading and 64kbps MP3 optimizations
 */

import React, { useEffect, useRef, useState } from 'react';
import { AdaptiveMobileAudioSystem, AdaptiveAudioConfig } from '../audio/AdaptiveMobileAudioSystem';

export interface AdaptiveIntegrationProps {
  onConfigChange?: (config: AdaptiveAudioConfig) => void;
  onPerformanceIssue?: (reason: string) => void;
  onQualityChange?: (newQuality: string) => void;
}

export interface AdaptiveSystemStatus {
  isInitialized: boolean;
  config: AdaptiveAudioConfig | null;
  performanceStatus: 'good' | 'warning' | 'critical';
  memoryUsage: string;
  recommendations: string[];
}

export const AdaptiveMobileIntegration: React.FC<AdaptiveIntegrationProps> = ({
  onConfigChange,
  onPerformanceIssue,
  onQualityChange
}) => {
  const [systemStatus, setSystemStatus] = useState<AdaptiveSystemStatus>({
    isInitialized: false,
    config: null,
    performanceStatus: 'good',
    memoryUsage: '0MB',
    recommendations: []
  });
  
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const initializationRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    
    initializeAdaptiveSystem();
  }, []);
  
  const initializeAdaptiveSystem = async () => {
    try {
      console.log('🚀 Initializing Adaptive Mobile Integration v7.3.5...');
      
      // Initialize the adaptive audio system
      const config = await AdaptiveMobileAudioSystem.initialize();
      
      // Expose to window for testing and debugging
      // @ts-ignore
      window.AdaptiveMobileAudioSystem = AdaptiveMobileAudioSystem;
      
      // Get initial status
      const recommendations = AdaptiveMobileAudioSystem.getRecommendations(config);
      
      setSystemStatus({
        isInitialized: true,
        config,
        performanceStatus: config.audioQuality === 'safe' ? 'critical' : 
                          config.audioQuality === 'low' ? 'warning' : 'good',
        memoryUsage: `${config.memoryLimitMB}MB limit`,
        recommendations
      });
      
      // Notify parent component
      onConfigChange?.(config);
      
      // Listen for configuration changes
      window.addEventListener('audioConfigChanged', handleConfigChange);
      
      console.log('✅ Adaptive Mobile Integration initialized successfully');
      logSystemDetails(config, recommendations);
      
    } catch (error) {
      console.error('❌ Failed to initialize Adaptive Mobile Integration:', error);
      setSystemStatus(prev => ({
        ...prev,
        isInitialized: false,
        performanceStatus: 'critical'
      }));
    }
  };
  
  const handleConfigChange = (event: CustomEvent) => {
    const { config, reason } = event.detail;
    
    console.log(`📡 Adaptive configuration changed: ${reason}`);
    
    setSystemStatus(prev => ({
      ...prev,
      config,
      performanceStatus: config.audioQuality === 'safe' ? 'critical' : 
                        config.audioQuality === 'low' ? 'warning' : 'good',
      recommendations: AdaptiveMobileAudioSystem.getRecommendations(config)
    }));
    
    onConfigChange?.(config);
    
    if (config.audioQuality === 'safe' || config.deviceTier === 'mobile-problem') {
      onPerformanceIssue?.(reason);
    }
    
    if (config.audioQuality !== prev.config?.audioQuality) {
      onQualityChange?.(config.audioQuality);
    }
  };
  
  const logSystemDetails = (config: AdaptiveAudioConfig, recommendations: string[]) => {
    console.group('🎵 Adaptive Mobile Audio System v7.3.5 Status');
    console.log('Device Tier:', config.deviceTier);
    console.log('Audio Quality:', config.audioQuality);
    console.log('Max Polyphony:', config.maxPolyphony);
    console.log('64kbps Priority:', config.use64kbpsPriority ? 'Enabled' : 'Disabled');
    console.log('Preload Strategy:', config.preloadStrategy);
    console.log('Memory Limit:', `${config.memoryLimitMB}MB`);
    console.log('Sample Rate:', `${config.recommendedSampleRate}Hz`);
    console.log('CPU Cores:', config.capabilities.cpuCores);
    console.log('CPU Speed:', config.capabilities.estimatedCpuSpeed);
    console.log('Memory:', `${config.capabilities.memoryGB}GB`);
    console.log('Network:', config.capabilities.networkSpeed);
    if (config.capabilities.batteryLevel) {
      console.log('Battery:', `${config.capabilities.batteryLevel}%`);
    }
    
    if (recommendations.length > 0) {
      console.group('💡 Active Optimizations:');
      recommendations.forEach(rec => console.log(`• ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  };
  
  const toggleDiagnostics = () => {
    setShowDiagnostics(prev => !prev);
  };
  
  const getPerformanceColor = () => {
    switch (systemStatus.performanceStatus) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getPerformanceIcon = () => {
    switch (systemStatus.performanceStatus) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '⏳';
    }
  };
  
  // Don't render anything in production unless diagnostics are enabled
  if (!showDiagnostics && process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating status indicator */}
      <div 
        className="bg-black/80 backdrop-blur-sm text-white rounded-lg p-2 cursor-pointer hover:bg-black/90 transition-colors"
        onClick={toggleDiagnostics}
        title={`Adaptive Audio Status: ${systemStatus.config?.deviceTier || 'Initializing'}`}
      >
        <div className="flex items-center space-x-2 text-sm">
          <span>{getPerformanceIcon()}</span>
          <span className={getPerformanceColor()}>
            {systemStatus.config?.audioQuality.toUpperCase() || 'INIT'}
          </span>
        </div>
      </div>
      
      {/* Detailed diagnostics panel */}
      {showDiagnostics && systemStatus.isInitialized && (
        <div className="absolute bottom-12 right-0 bg-black/90 backdrop-blur-sm text-white rounded-lg p-4 w-80 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-600 pb-2">
              <h3 className="font-bold text-lg">Adaptive Audio v7.3.5</h3>
              <button 
                onClick={toggleDiagnostics}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            {/* Device Configuration */}
            <div>
              <h4 className="font-semibold text-yellow-400 mb-2">Device Configuration</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Device Tier:</span>
                  <span className="font-mono">{systemStatus.config?.deviceTier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Quality:</span>
                  <span className={`font-mono ${getPerformanceColor()}`}>
                    {systemStatus.config?.audioQuality.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Rate:</span>
                  <span className="font-mono">{systemStatus.config?.recommendedSampleRate}Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Polyphony:</span>
                  <span className="font-mono">{systemStatus.config?.maxPolyphony}</span>
                </div>
                <div className="flex justify-between">
                  <span>64kbps Priority:</span>
                  <span className="font-mono">
                    {systemStatus.config?.use64kbpsPriority ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Preload Strategy:</span>
                  <span className="font-mono">{systemStatus.config?.preloadStrategy}</span>
                </div>
              </div>
            </div>
            
            {/* Device Capabilities */}
            {systemStatus.config?.capabilities && (
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">Device Capabilities</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>CPU Cores:</span>
                    <span className="font-mono">{systemStatus.config.capabilities.cpuCores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU Speed:</span>
                    <span className="font-mono">{systemStatus.config.capabilities.estimatedCpuSpeed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span className="font-mono">{systemStatus.config.capabilities.memoryGB}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="font-mono">{systemStatus.config.capabilities.networkSpeed}</span>
                  </div>
                  {systemStatus.config.capabilities.batteryLevel && (
                    <div className="flex justify-between">
                      <span>Battery:</span>
                      <span className="font-mono">{systemStatus.config.capabilities.batteryLevel}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Performance Status */}
            <div>
              <h4 className="font-semibold text-purple-400 mb-2">Performance Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-mono ${getPerformanceColor()}`}>
                    {systemStatus.performanceStatus.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Memory Limit:</span>
                  <span className="font-mono">{systemStatus.memoryUsage}</span>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            {systemStatus.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-400 mb-2">Active Optimizations</h4>
                <ul className="space-y-1 text-xs">
                  {systemStatus.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Reason */}
            <div className="pt-2 border-t border-gray-600">
              <p className="text-xs text-gray-300 italic">
                {systemStatus.config?.reason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Hook to use adaptive audio system in components
 */
export const useAdaptiveAudio = () => {
  const [config, setConfig] = useState<AdaptiveAudioConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        const initialConfig = await AdaptiveMobileAudioSystem.initialize();
        setConfig(initialConfig);
        setIsInitialized(true);
        
        // Listen for changes
        const handleConfigChange = (event: CustomEvent) => {
          setConfig(event.detail.config);
        };
        
        window.addEventListener('audioConfigChanged', handleConfigChange);
        
        return () => {
          window.removeEventListener('audioConfigChanged', handleConfigChange);
        };
      } catch (error) {
        console.error('Failed to initialize adaptive audio system:', error);
      }
    };
    
    initializeSystem();
  }, []);
  
  const createOptimizedAudioContext = async () => {
    return AdaptiveMobileAudioSystem.createOptimizedAudioContext();
  };
  
  const getQualitySettings = () => {
    if (!config) return null;
    return AdaptiveMobileAudioSystem.getQualitySettings(config);
  };
  
  const getDiagnosticInfo = async () => {
    return AdaptiveMobileAudioSystem.getDiagnosticInfo();
  };
  
  return {
    config,
    isInitialized,
    createOptimizedAudioContext,
    getQualitySettings,
    getDiagnosticInfo
  };
};

/**
 * Configuration component for manual testing
 */
export const AdaptiveConfigPanel: React.FC = () => {
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const info = await AdaptiveMobileAudioSystem.getDiagnosticInfo();
      setDiagnosticInfo(info);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    }
    setIsLoading(false);
  };
  
  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Adaptive Audio Configuration</h2>
        <button 
          onClick={loadDiagnostics}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors"
        >
          {isLoading ? 'Loading...' : 'Load Diagnostics'}
        </button>
      </div>
      
      {diagnosticInfo && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Configuration</h3>
            <pre className="bg-black/50 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(diagnosticInfo.config, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-400">System Information</h3>
            <pre className="bg-black/50 p-3 rounded text-sm overflow-x-auto">
              {JSON.stringify(diagnosticInfo.systemInfo, null, 2)}
            </pre>
          </div>
          
          {diagnosticInfo.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-400">Recommendations</h3>
              <ul className="space-y-1">
                {diagnosticInfo.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-green-400">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};