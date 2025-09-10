/**
 * SoundAngeles Drum Sequencer - Intelligent Fallback System
 * Auto-detects environment and falls back to mobile-friendly version
 */

import { useState, useEffect } from 'react';
import ProfessionalDrumSequencer from '@/components/ProfessionalDrumSequencer';
import MobileFallback from '@/components/MobileFallback';
import { AdaptiveMobileIntegration } from '@/components/AdaptiveMobileIntegration';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [showFallback, setShowFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string>('');

  useEffect(() => {
    // Test both static data and API availability
    const testSampleAvailability = async () => {
      try {
        console.log('🔍 Testing sample data availability...');
        
        // First try static JSON data (production compatible)
        try {
          const staticResponse = await fetch('/sample-packs-data.json', {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            if (staticData.packs && staticData.packs.length > 0) {
              console.log('✅ Static sample data available, using full sequencer');
              console.log(`📦 Found ${staticData.packs.length} static packs`);
              setShowFallback(false);
              setIsLoading(false);
              return;
            }
          }
        } catch (staticError) {
          console.log('⚠️ Static data not available, trying API:', staticError);
        }
        
        // Fallback to API (development mode)
        const response = await fetch('/api/discover-packs', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API sample discovery working:', data);
          
          // Check if we actually have packs
          if (data.packs && data.packs.length > 0) {
            console.log('✅ API sample packs available, using full sequencer');
            setShowFallback(false);
          } else {
            console.log('⚠️ No sample packs found via API, using fallback');
            setInitError('No sample packs available');
            setShowFallback(true);
          }
        } else {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        console.log('❌ Both static data and API failed, using mobile fallback:', error);
        setInitError(`Sample loading failed: ${error.message}`);
        setShowFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Also check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || window.innerWidth < 768;
    
    if (isMobile) {
      console.log('📱 Mobile device detected, will test both static and API');
    }

    // Start the test
    testSampleAvailability();
  }, []);

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="h-12 w-12 animate-spin mb-4 text-blue-500" />
        <h2 className="text-xl font-semibold mb-2">Loading SoundAngeles Drum Sequencer</h2>
        <p className="text-gray-400">Detecting optimal version for your device...</p>
      </div>
    );
  }

  // Error fallback info
  if (showFallback && initError) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-200">
                <strong>Notice:</strong> Full sample library unavailable ({initError})
              </p>
              <p className="text-xs text-yellow-300 mt-1">
                Using synthesized drum sounds for mobile/production compatibility
              </p>
            </div>
          </div>
        </div>
        <MobileFallback />
        <AdaptiveMobileIntegration 
          onConfigChange={(config) => {
            console.log('📱 Mobile fallback adaptive config:', config.deviceTier);
          }}
          onPerformanceIssue={(reason) => {
            console.warn('⚠️ Mobile fallback performance issue:', reason);
          }}
          onQualityChange={(newQuality) => {
            console.log('🎵 Mobile fallback quality changed to:', newQuality);
          }}
        />
      </div>
    );
  }

  // Show fallback version
  if (showFallback) {
    return (
      <>
        <MobileFallback />
        <AdaptiveMobileIntegration 
          onConfigChange={(config) => {
            console.log('📱 Fallback adaptive config:', config.deviceTier);
          }}
          onPerformanceIssue={(reason) => {
            console.warn('⚠️ Fallback performance issue:', reason);
          }}
          onQualityChange={(newQuality) => {
            console.log('🎵 Fallback quality changed to:', newQuality);
          }}
        />
      </>
    );
  }

  // Show full professional version with adaptive integration
  return (
    <>
      <ProfessionalDrumSequencer />
      <AdaptiveMobileIntegration 
        onConfigChange={(config) => {
          console.log('📱 Adaptive configuration updated:', config.deviceTier);
        }}
        onPerformanceIssue={(reason) => {
          console.warn('⚠️ Performance issue detected:', reason);
        }}
        onQualityChange={(newQuality) => {
          console.log('🎵 Audio quality changed to:', newQuality);
        }}
      />
    </>
  );
};

export default Index;
