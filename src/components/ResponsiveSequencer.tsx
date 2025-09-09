import { useState, useEffect } from 'react';
import SoundAngelesDrumSequencer from './SoundAngelesDrumSequencer';
import DrumSequencerMobile from './DrumSequencerMobile';

const ResponsiveSequencer = () => {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [scaleFactor, setScaleFactor] = useState(1);

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Responsive Desktop ab 1200px - Skalierung macht Desktop-Experience für mehr Geräte verfügbar
      // Unter 1200px -> Mobile Version (wie ursprünglich)
      if (width >= 1200) {
        setMode('desktop');
        
        // Intelligente Skalierung für Desktop-Version (erweitert: 60%-120% Flexibilität)
        // Basis: 1200px Hardware-Design passt sich an 1200px-2000px+ Viewports an
        const minScale = 0.6;  // 60% minimum für sehr kleine Desktop-Fenster
        const maxScale = 1.2;  // 120% maximum für große Displays
        
        // Berechne Skalierung basierend auf verfügbarem Platz
        const availableWidth = width - 40; // 20px padding links+rechts
        const availableHeight = height - 40; // 20px padding oben+unten
        
        // Skalierung basierend auf Breite (1200px = 100%)
        let widthScale = availableWidth / 1200;
        
        // Skalierung basierend auf Höhe (Desktop braucht ~800px Höhe = 100%)
        let heightScale = availableHeight / 800;
        
        // Verwende die kleinere Skalierung (damit alles reinpasst)
        let calculatedScale = Math.min(widthScale, heightScale);
        
        // Erweiterte Skalierungs-Range: 60%-120%
        calculatedScale = Math.max(minScale, Math.min(maxScale, calculatedScale));
        
        // Extra: Bei 1200px-1300px sanfte Einführung (nicht zu klein)
        if (width >= 1200 && width <= 1300 && calculatedScale < 0.85) {
          calculatedScale = Math.max(0.85, calculatedScale);
        }
        
        setScaleFactor(calculatedScale);
      } else {
        setMode('mobile');
        setScaleFactor(1); // Mobile version doesn't need scaling
      }
    };

    // Initial check
    checkViewport();
    
    // Listen for viewport changes
    window.addEventListener('resize', checkViewport);
    
    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  return mode === 'desktop' ? (
    <div className="hardware-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Skalierbare Hardware-Computer Container */}
      <div style={{
        width: '1200px',
        transform: `scale(${scaleFactor})`,
        transformOrigin: 'center center',
        transition: 'transform 0.3s ease'
      }}>
        <SoundAngelesDrumSequencer />
      </div>
      
      {/* Debug Info (nur für Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          Scale: {(scaleFactor * 100).toFixed(0)}%
        </div>
      )}
    </div>
  ) : (
    <DrumSequencerMobile />
  );
};

export default ResponsiveSequencer;