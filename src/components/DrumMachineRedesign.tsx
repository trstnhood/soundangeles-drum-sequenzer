import React, { useState } from 'react';
import { WippSchalter } from './WippSchalter';
import { RotaryKnob } from './RotaryKnob';

const DrumMachineRedesign: React.FC = () => {
  const [masterVolume, setMasterVolume] = useState(70);
  const [selectedInstrument, setSelectedInstrument] = useState(0);
  
  // Sample data for instruments
  const instruments = [
    { name: 'KICK', samples: 16, volume: 75, currentSample: 0 },
    { name: 'SNARE', samples: 24, volume: 65, currentSample: 3 },
    { name: 'HI HATS', samples: 16, volume: 60, currentSample: 5 },
    { name: 'OPEN HATS', samples: 8, volume: 55, currentSample: 1 },
    { name: 'CYM', samples: 8, volume: 50, currentSample: 0 },
    { name: 'CLAPS', samples: 8, volume: 70, currentSample: 3 },
    { name: 'PERC', samples: 18, volume: 45, currentSample: 11 },
    { name: 'TOM', samples: 6, volume: 65, currentSample: 2 },
  ];

  const [instrumentStates, setInstrumentStates] = useState(instruments);

  const handleSampleChange = (instrumentIndex: number, direction: 'prev' | 'next') => {
    setInstrumentStates(prev => {
      const newStates = [...prev];
      const current = newStates[instrumentIndex].currentSample;
      const total = newStates[instrumentIndex].samples;
      
      if (direction === 'next') {
        newStates[instrumentIndex].currentSample = (current + 1) % total;
      } else {
        newStates[instrumentIndex].currentSample = (current - 1 + total) % total;
      }
      
      return newStates;
    });
  };

  const handleVolumeChange = (instrumentIndex: number, newVolume: number) => {
    setInstrumentStates(prev => {
      const newStates = [...prev];
      newStates[instrumentIndex].volume = newVolume;
      return newStates;
    });
  };

  return (
    <div className="wood-panel-container">
      {/* Wood Panels */}
      <div className="wood-panel-left">
        <img src="/ui-elements/Woodpanels/Wood-left.png" alt="Wood Panel Left" />
      </div>
      <div className="wood-panel-right">
        <img src="/ui-elements/Woodpanels/wood-right.png" alt="Wood Panel Right" />
      </div>

      {/* Main Content */}
      <div className="drum-machine-content">
        {/* Header with Metal Plate */}
        <div className="hardware-panel">
          <div className="metal-plate">
            <div className="screw top-left" />
            <div className="screw top-right" />
            <div className="screw bottom-left" />
            <div className="screw bottom-right" />
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              background: 'linear-gradient(180deg, #8B7355 0%, #5C4A3A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '4px'
            }}>
              SOUNDANGELES
            </h1>
            <p style={{ 
              fontSize: '12px', 
              color: '#5C4A3A',
              letterSpacing: '2px',
              marginTop: '4px'
            }}>
              DRUM SEQUENZER
            </p>
          </div>
        </div>

        {/* Master Volume Section */}
        <div className="hardware-panel" style={{ alignSelf: 'flex-start' }}>
          <RotaryKnob
            value={masterVolume}
            onChange={setMasterVolume}
            size="big"
            label="VOLUME"
          />
        </div>

        {/* Instruments Section */}
        <div className="hardware-panel">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            padding: '16px'
          }}>
            {instrumentStates.map((inst, index) => (
              <div key={inst.name} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* Volume Knob */}
                <RotaryKnob
                  value={inst.volume}
                  onChange={(val) => handleVolumeChange(index, val)}
                  size="mid"
                />
                
                {/* Wipp Schalter */}
                <WippSchalter
                  isActive={selectedInstrument === index}
                  onPrevious={() => handleSampleChange(index, 'prev')}
                  onNext={() => handleSampleChange(index, 'next')}
                  currentIndex={inst.currentSample}
                  totalSamples={inst.samples}
                  instrumentName={inst.name}
                />
                
                {/* Click to Select */}
                <button
                  onClick={() => setSelectedInstrument(index)}
                  style={{
                    marginTop: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    background: selectedInstrument === index ? '#c93026' : 'transparent',
                    color: selectedInstrument === index ? 'white' : '#666',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedInstrument === index ? 'ACTIVE' : 'SELECT'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Section Placeholder */}
        <div className="hardware-panel">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(16, 1fr)',
            gap: '8px',
            padding: '24px'
          }}>
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                  borderRadius: '4px',
                  border: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '12px'
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrumMachineRedesign;