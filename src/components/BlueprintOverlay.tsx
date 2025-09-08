import React, { useState } from 'react';

interface BlueprintOverlayProps {
  visible?: boolean;
  opacity?: number;
  onToggle?: (visible: boolean) => void;
}

export const BlueprintOverlay: React.FC<BlueprintOverlayProps> = ({
  visible = false,
  opacity = 0.5,
  onToggle
}) => {
  if (!visible) return null;

  return (
    <>
      {/* Blueprint Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/ui-elements/blueprint.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: opacity,
          pointerEvents: 'none',
          zIndex: 9999,
          mixBlendMode: 'multiply' as const,
        }}
      />
      
      {/* Blueprint Controls */}
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '8px 12px',
          borderRadius: '4px',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'Monaco, monospace'
        }}
      >
        <div>Blueprint Mode</div>
        <button
          onClick={() => onToggle?.(false)}
          style={{
            background: '#c93026',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '10px',
            marginTop: '4px'
          }}
        >
          Hide (ESC)
        </button>
      </div>
    </>
  );
};

// Hook für Blueprint-Toggle mit Keyboard-Shortcut
export const useBlueprintOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0.5);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Blueprint mit 'b' oder 'B'
      if (e.key.toLowerCase() === 'b' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setVisible(prev => !prev);
      }
      
      // Hide mit Escape
      if (e.key === 'Escape') {
        setVisible(false);
      }
      
      // Opacity mit +/- wenn Blueprint sichtbar
      if (visible) {
        if (e.key === '+' || e.key === '=') {
          setOpacity(prev => Math.min(1, prev + 0.1));
        }
        if (e.key === '-' || e.key === '_') {
          setOpacity(prev => Math.max(0.1, prev - 0.1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  return {
    visible,
    opacity,
    setVisible,
    setOpacity
  };
};

export default BlueprintOverlay;