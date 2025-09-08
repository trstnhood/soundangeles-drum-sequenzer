import React, { useMemo, useState, useCallback, useEffect } from 'react';

interface AnimatedKnobProps {
  /** Current value (0-100) */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Knob type: 'volume' for round knob or 'slider' for horizontal slider */
  type?: 'volume' | 'slider';
  /** Click handler */
  onClick?: () => void;
  /** Drag change handler (for sliders) */
  onValueChange?: (value: number) => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Custom CSS classes */
  className?: string;
}

/**
 * VINTAGE ANIMATED KNOB COMPONENT
 * 
 * Features:
 * - 256-frame smooth animation (hardware-level precision)
 * - Automatic frame calculation based on value (0-100)
 * - Support for round knobs and horizontal sliders
 * - Performance optimized with useMemo
 * - Fallback to reduced frames if needed
 */
export const AnimatedKnob: React.FC<AnimatedKnobProps> = ({
  value,
  size = 32,
  type = 'volume',
  onClick,
  onValueChange,
  ariaLabel,
  className = ''
}) => {
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Preload all frames for flicker-free dragging
  useEffect(() => {
    if (type === 'slider') {
      let loadedCount = 0;
      const totalImages = 32;
      
      // Preload all 32 slider frames with loading tracking
      for (let i = 0; i <= 31; i++) {
        const img = new Image();
        const paddedFrame = i.toString().padStart(4, '0');
        img.src = `/ui-elements/knobs/volume_slider_32/Hor_slider_${paddedFrame}.png`;
        
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            setImagesLoaded(true);
            console.log('🎯 Volume slider: All 32 frames preloaded successfully');
          }
        };
        
        img.onerror = () => {
          console.warn(`❌ Failed to load frame: ${img.src}`);
        };
      }
    } else {
      setImagesLoaded(true); // Round knobs don't need preloading
    }
  }, [type]);
  
  // Calculate frame number - simplified for optimized 32-frame folder
  const frameNumber = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(100, value));
    // Direct mapping to 0-31 frames (no skipping needed)
    return Math.round((clampedValue / 100) * 31);
  }, [value]);

  // Build image path with proper zero-padding
  const imagePath = useMemo(() => {
    const paddedFrame = frameNumber.toString().padStart(4, '0');
    
    if (type === 'volume') {
      // Round rotating knob
      return `/ui-elements/knobs/Knob_mid/Knob_mid_${paddedFrame}.png`;
    } else {
      // Optimized horizontal slider (32 frames only)
      return `/ui-elements/knobs/volume_slider_32/Hor_slider_${paddedFrame}.png`;
    }
  }, [frameNumber, type]);

  // Dynamic sizing based on type
  const knobSize = useMemo(() => {
    if (type === 'slider') {
      // Horizontal slider: original PNG aspect ratio (222x52 = 4.27:1)
      return {
        width: size * 4.27, // Original PNG aspect ratio
        height: size
      };
    } else {
      // Round knob: square aspect ratio
      return {
        width: size,
        height: size
      };
    }
  }, [size, type]);

  // Drag handlers for sliders
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (type === 'slider' && onValueChange && imagesLoaded) {
      e.preventDefault();
      setIsDragging(true);
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onValueChange(percentage);
      };
      
      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Immediate value update
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onValueChange(percentage);
    } else if (onClick) {
      onClick();
    }
  }, [type, onValueChange, onClick, imagesLoaded]);

  return (
    <button
      className={`p-0 border-none bg-transparent ${type === 'slider' ? 'transition-none' : 'transition-transform hover:scale-105 active:scale-95'} ${className}`}
      style={{
        width: knobSize.width,
        height: knobSize.height,
        backgroundImage: imagesLoaded ? `url(${imagePath})` : 'none',
        backgroundColor: !imagesLoaded && type === 'slider' ? '#333' : 'transparent',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        cursor: type === 'slider' ? (imagesLoaded ? (isDragging ? 'grabbing' : 'grab') : 'wait') : 'pointer'
      }}
      onMouseDown={handleMouseDown}
      aria-label={ariaLabel || `${type} control: ${Math.round(value)}%`}
      title={imagesLoaded ? `${Math.round(value)}%` : 'Loading frames...'}
    >
      {/* Loading indicator for sliders */}
      {!imagesLoaded && type === 'slider' && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
          Loading...
        </div>
      )}
    </button>
  );
};


export default AnimatedKnob;