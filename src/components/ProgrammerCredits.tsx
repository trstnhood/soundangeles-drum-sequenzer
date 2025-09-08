import React, { useState } from 'react';
import { Code2 } from 'lucide-react';

interface ProgrammerCreditsProps {
  position?: 'mobile' | 'desktop';
}

const ProgrammerCredits: React.FC<ProgrammerCreditsProps> = ({ position = 'mobile' }) => {
  const [showOverlay, setShowOverlay] = useState(false);

  const creditsText = "Beat für Beat mit ♥ programmiert | tristanladwein.com & Claude Code für soundangeles.com © 2025 soundangeles.com ™";

  return (
    <>
      {/* Credits Icon */}
      <div 
        className={`
          ${position === 'mobile' ? 'fixed bottom-4 right-6 z-50' : 'absolute bottom-8 right-32 z-50'}
          cursor-pointer transition-all duration-300 hover:scale-110
        `}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
        onClick={() => setShowOverlay(!showOverlay)}
      >
        {/* Animated Background Circle with 15° rotation */}
        <div className="relative" style={{ transform: 'rotate(-15deg)' }}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          
          {/* Blinking Dot Indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* Credits Overlay */}
      {showOverlay && (
        <div 
          className={`
            ${position === 'mobile' ? 'fixed bottom-16 right-6 z-40' : 'absolute bottom-20 right-32 z-40'}
            max-w-sm p-4 bg-white text-gray-800 text-xs rounded-lg shadow-2xl
            transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-2
          `}
          style={{ 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          {/* Arrow pointing to icon */}
          <div className="absolute bottom-0 right-6 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white translate-y-full"></div>
          
          <div className="text-center leading-relaxed">
            <div className="text-gray-700">
              Beat für Beat mit <span className="text-red-600">♥</span> programmiert
            </div>
            <div className="mt-2 text-gray-600 text-xs">
              <a 
                href="https://tristanladwein.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors underline"
              >
                tristanladwein.com
              </a>
              <span className="mx-1">&</span>
              <span className="text-purple-600">Claude Code</span>
            </div>
            <div className="mt-1 text-gray-600 text-xs">
              für <a 
                href="https://soundangeles.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-800 transition-colors underline"
              >
                soundangeles.com
              </a>
            </div>
            <div className="mt-2 text-gray-500 text-xs border-t border-gray-300 pt-2">
              © 2025 soundangeles.com ™
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProgrammerCredits;