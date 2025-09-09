import { useState, useEffect } from 'react';
import SoundAngelesDrumSequencer from './SoundAngelesDrumSequencer';
import DrumSequencerMobile from './DrumSequencerMobile';

const ResponsiveSequencer = () => {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      // Hardware-Computer braucht mindestens 1400px für professionelle Hardware-Fidelity
      // Unter 1400px würde das Hardware-Design gequetscht aussehen (Tablets zeigen sonst abgeschnittene Desktop-Version)
      setMode(width >= 1400 ? 'desktop' : 'mobile');
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
    <div className="hardware-container">
      {/* Hardware-Computer Container mit fester Größe */}
      <div style={{
        minWidth: '1200px',
        width: '1200px',
        margin: '0 auto',
        padding: '20px 0'
      }}>
        <SoundAngelesDrumSequencer />
      </div>
    </div>
  ) : (
    <DrumSequencerMobile />
  );
};

export default ResponsiveSequencer;