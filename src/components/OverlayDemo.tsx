import React, { useState, useEffect } from 'react';
import { X, Play, ShoppingCart, Maximize2 } from 'lucide-react';
import RealSequencerInOverlay from './RealSequencerInOverlay';

interface OverlayDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

const OverlayDemo: React.FC<OverlayDemoProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const loadingMessages = [
    'Lade Audio Engine...',
    'Initialisiere Sample Packs...',
    'Starte Professional Sequencer...',
    'Fast fertig...'
  ];

  // Loading Animation Effect
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(true);
      setLoadingProgress(0);
      setCurrentMessage(0);
      return;
    }

    // Progress Animation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const increment = Math.random() * 15 + 5;
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsLoading(false), 800);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    // Message Rotation
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Disable scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = ''; // Re-enable scroll
    };
  }, [isOpen, onClose]);

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        console.log('Fullscreen not supported');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`
        relative w-[95vw] h-[90vh] max-w-[1400px] max-h-[900px]
        bg-white rounded-2xl shadow-2xl
        flex flex-col overflow-hidden
        transform transition-all duration-500 ease-out
        ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        md:w-[90vw] md:h-[85vh]
        sm:w-full sm:h-full sm:rounded-none sm:max-w-none sm:max-h-none
      `}>
        

        {/* Loading Screen */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center max-w-md mx-auto px-6">
              
              {/* Spinner */}
              <div className="w-20 h-20 mx-auto mb-8 border-4 border-gray-200 border-l-indigo-600 rounded-full animate-spin" />
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${loadingProgress}%` }}
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
              
              {/* Loading Message */}
              <p className="text-gray-600 font-medium animate-pulse">
                {loadingMessages[currentMessage]}
              </p>
              
              {/* Progress Percentage */}
              <p className="text-sm text-gray-400 mt-2">
                {Math.round(loadingProgress)}%
              </p>
            </div>
          </div>
        )}

        {/* ECHTER Sequencer Content */}
        {!isLoading && (
          <div className="flex-1 overflow-hidden relative">
            
            {/* Control Buttons - Floating on Sequencer */}
            <div className="absolute top-4 right-4 z-20 flex gap-3">
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-3 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-lg"
                aria-label="Toggle Fullscreen"
              >
                <Maximize2 size={20} />
              </button>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-3 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-lg"
                aria-label="Close Overlay"
              >
                <X size={20} />
              </button>
            </div>
            
            <RealSequencerInOverlay onCartAdd={(packName) => {
              // Simulate cart addition for demo
              alert(`✅ ${packName} would be added to cart in WordPress!`);
            }} />
          </div>
        )}

      </div>
    </div>
  );
};

export default OverlayDemo;