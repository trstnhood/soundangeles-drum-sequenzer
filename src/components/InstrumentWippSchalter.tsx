import React, { useState } from 'react';

interface InstrumentWippSchalterProps {
  instrumentName: string;
  currentSampleIndex: number;
  totalSamples: number;
  isActive: boolean;
  onPreviousSample: () => void;
  onNextSample: () => void;
  onSelect: () => void;
}

export const InstrumentWippSchalter: React.FC<InstrumentWippSchalterProps> = ({
  instrumentName,
  currentSampleIndex,
  totalSamples,
  isActive,
  onPreviousSample,
  onNextSample,
  onSelect,
}) => {
  const [clickState, setClickState] = useState<'normal' | 'left' | 'right'>('normal');

  // Bestimme PNG-Variante basierend auf Active-State
  const variant = isActive ? 'ROT' : 'hell';
  
  // Bestimme Click-State für PNG
  let pngState = 'normal';
  if (clickState === 'left') {
    pngState = 'linksklick';
  } else if (clickState === 'right') {
    pngState = 'rechtsklick';
  }

  const pngPath = `/ui-elements/Instrument-wipp-schalter/${variant}-${pngState}.png`;

  const handleLeftClick = () => {
    setClickState('left');
    onPreviousSample();
    setTimeout(() => setClickState('normal'), 150);
  };

  const handleRightClick = () => {
    setClickState('right');
    onNextSample();
    setTimeout(() => setClickState('normal'), 150);
  };

  const handleCenterClick = () => {
    onSelect();
  };

  return (
    <div className="instrument-wipp-container" style={{
      position: 'relative',
      display: 'inline-block',
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      {/* PNG Background */}
      <img
        src={pngPath}
        alt={`${instrumentName} WippSchalter`}
        draggable={false}
        style={{
          display: 'block',
          height: '48px',
          width: 'auto',
          objectFit: 'contain',
        }}
      />

      {/* Click Areas */}
      {/* Left Area - Previous Sample */}
      <div
        onClick={handleLeftClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '30%',
          height: '100%',
          cursor: 'pointer',
          zIndex: 2,
        }}
        title={`Previous ${instrumentName} sample`}
      />

      {/* Center Area - Select Instrument */}
      <div
        onClick={handleCenterClick}
        style={{
          position: 'absolute',
          top: 0,
          left: '30%',
          width: '40%',
          height: '100%',
          cursor: 'pointer',
          zIndex: 2,
        }}
        title={`Select ${instrumentName}`}
      />

      {/* Right Area - Next Sample */}
      <div
        onClick={handleRightClick}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '30%',
          height: '100%',
          cursor: 'pointer',
          zIndex: 2,
        }}
        title={`Next ${instrumentName} sample`}
      />

      {/* Text Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      >
        {/* Instrument Name */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: isActive ? 'white' : '#333',
            textShadow: isActive 
              ? '1px 1px 2px rgba(0,0,0,0.8)' 
              : '1px 1px 2px rgba(255,255,255,0.8)',
            marginBottom: '1px',
            lineHeight: '1',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}
        >
          {instrumentName}
        </div>

        {/* Sample Counter */}
        <div
          style={{
            fontSize: '10px',
            color: isActive ? '#ccc' : '#666',
            textShadow: isActive 
              ? '1px 1px 2px rgba(0,0,0,0.8)' 
              : '1px 1px 2px rgba(255,255,255,0.8)',
            lineHeight: '1',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          {currentSampleIndex + 1}/{totalSamples}
        </div>
      </div>
    </div>
  );
};

export default InstrumentWippSchalter;