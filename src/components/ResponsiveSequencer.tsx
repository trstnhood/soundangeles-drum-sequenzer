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
      
      // Hardware-Computer braucht mindestens 1400px für professionelle Hardware-Fidelity
      // Unter 1400px würde das Hardware-Design gequetscht aussehen (Tablets zeigen sonst abgeschnittene Desktop-Version)
      if (width >= 1400) {
        setMode('desktop');
        
        // Intelligente Skalierung für Desktop-Version (±20% Flexibilität)
        // Basis: 1200px bei 1500px Viewport = 1.0 scale
        const baseViewportWidth = 1500;
        const minScale = 0.8;  // 80% minimum
        const maxScale = 1.2;  // 120% maximum
        
        // Berechne Skalierung basierend auf verfügbarem Platz
        const availableWidth = width - 40; // 20px padding links+rechts
        const availableHeight = height - 40; // 20px padding oben+unten
        
        // Skalierung basierend auf Breite
        let widthScale = availableWidth / 1200;
        
        // Skalierung basierend auf Höhe (um Abschneiden zu verhindern)
        // Desktop-Version braucht ca. 800px Höhe
        let heightScale = availableHeight / 800;
        
        // Verwende die kleinere Skalierung (damit alles reinpasst)
        let calculatedScale = Math.min(widthScale, heightScale);
        
        // Begrenze auf ±20% Range
        calculatedScale = Math.max(minScale, Math.min(maxScale, calculatedScale));
        
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