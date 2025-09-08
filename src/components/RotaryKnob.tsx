import React, { useState, useRef, useEffect, useCallback } from 'react';

interface RotaryKnobProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  size: 'big' | 'mid';
  label?: string;
  min?: number;
  max?: number;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  value,
  onChange,
  size,
  label,
  min = 0,
  max = 100,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(value);
  const knobRef = useRef<HTMLDivElement>(null);
  
  // Calculate frame index based on value (0-255 for 256 frames)
  const frameIndex = Math.floor((value / 100) * 255);
  const paddedIndex = frameIndex.toString().padStart(4, '0');
  
  // Construct image path
  const imagePath = size === 'big' 
    ? `/ui-elements/knob_big-volume-master/Knob_big_${paddedIndex}.png`
    : `/ui-elements/knob_mid-volume-instruments/Knob_mid_${paddedIndex}.png`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.clientY;
    const sensitivity = 0.5; // Adjust for feel
    const newValue = startValue + (deltaY * sensitivity);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    onChange(Math.round(clampedValue));
  }, [isDragging, startY, startValue, onChange, min, max]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setStartY(touch.clientY);
    setStartValue(value);
  }, [value]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = startY - touch.clientY;
    const sensitivity = 0.5;
    const newValue = startValue + (deltaY * sensitivity);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    onChange(Math.round(clampedValue));
  }, [isDragging, startY, startValue, onChange, min, max]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse wheel support
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const sensitivity = 0.1;
    const newValue = value + (delta * sensitivity);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    onChange(Math.round(clampedValue));
  }, [value, onChange, min, max]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={`rotary-knob rotary-knob-${size}`}>
      {label && (
        <div className="knob-label">{label}</div>
      )}
      <div
        ref={knobRef}
        className={`knob-container ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'ns-resize' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <img
          src={imagePath}
          alt={`${label || 'Volume'} knob at ${value}%`}
          className="knob-image"
          style={{ 
            width: size === 'big' ? '190px !important' : '64px !important',
            height: size === 'big' ? '190px !important' : '64px !important',
            minWidth: size === 'big' ? '190px' : '64px',
            minHeight: size === 'big' ? '190px' : '64px',
            maxWidth: size === 'big' ? '190px' : '64px',
            maxHeight: size === 'big' ? '190px' : '64px'
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default RotaryKnob;