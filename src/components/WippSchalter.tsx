import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WippSchalterProps {
  isActive: boolean;
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalSamples: number;
  instrumentName: string;
}

export const WippSchalter: React.FC<WippSchalterProps> = ({
  isActive,
  onPrevious,
  onNext,
  currentIndex,
  totalSamples,
  instrumentName,
}) => {
  const [tiltDirection, setTiltDirection] = useState<'left' | 'right' | null>(null);

  const handleMouseDown = (direction: 'left' | 'right') => {
    setTiltDirection(direction);
    if (direction === 'left') {
      onPrevious();
    } else {
      onNext();
    }
  };

  const handleMouseUp = () => {
    setTiltDirection(null);
  };

  const handleTouchStart = (direction: 'left' | 'right') => {
    setTiltDirection(direction);
    if (direction === 'left') {
      onPrevious();
    } else {
      onNext();
    }
  };

  const handleTouchEnd = () => {
    setTiltDirection(null);
  };

  return (
    <div className="wipp-container">
      <div className={`wipp-schalter ${isActive ? 'active' : 'inactive'}`}>
        <button
          className={`wipp-left ${tiltDirection === 'left' ? 'pressed' : ''}`}
          onMouseDown={() => handleMouseDown('left')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={() => handleTouchStart('left')}
          onTouchEnd={handleTouchEnd}
          aria-label={`Previous ${instrumentName} sample`}
        >
          <ChevronLeft size={16} className="wipp-arrow" />
        </button>
        
        <div className="wipp-center">
          <span className="wipp-instrument-name">{instrumentName}</span>
          <span className="wipp-counter">{currentIndex + 1}/{totalSamples}</span>
        </div>
        
        <button
          className={`wipp-right ${tiltDirection === 'right' ? 'pressed' : ''}`}
          onMouseDown={() => handleMouseDown('right')}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={() => handleTouchStart('right')}
          onTouchEnd={handleTouchEnd}
          aria-label={`Next ${instrumentName} sample`}
        >
          <ChevronRight size={16} className="wipp-arrow" />
        </button>
      </div>
    </div>
  );
};

export default WippSchalter;