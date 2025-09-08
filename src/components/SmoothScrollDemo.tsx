import React, { useState, useEffect } from 'react';
import { Play, Music, Headphones, Download } from 'lucide-react';
import OverlayDemo from './OverlayDemo';

const SmoothScrollDemo: React.FC = () => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Smooth scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Parallax effect
  const parallaxStyle = {
    transform: `translateY(${scrollY * 0.5}px)`,
  };

  const parallaxSlowStyle = {
    transform: `translateY(${scrollY * 0.3}px)`,
  };

  return (
    <>
      {/* Hero Section with Parallax */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700">
        
        {/* Parallax Background Elements */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-purple-600/30"
          style={parallaxStyle}
        />
        
        <div 
          className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          style={parallaxSlowStyle}
        />
        
        <div 
          className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
          style={parallaxStyle}
        />

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            SoundAngeles
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-purple-100">
            Professional Sample Packs mit revolutionärem Browser Sequencer
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Main CTA - Opens Overlay */}
            <button
              onClick={() => setIsOverlayOpen(true)}
              className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <Play size={24} className="group-hover:scale-110 transition-transform" />
              🎵 Samples ausprobieren
            </button>
            
            <button className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300 flex items-center gap-3">
              <Download size={20} />
              Sample Packs ansehen
            </button>
          </div>
          
          <p className="text-sm text-purple-200 mt-6">
            ✨ Teste das neue Overlay Modal System ✨
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Content Section 1 - Smooth Scroll Test */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Smooth Scroll Test Bereich
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Scrolle hier, um zu sehen wie sich das Overlay Modal System verhält. 
              Öffne das Overlay und teste ob Scroll-Verhalten pausiert wird.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <Music size={48} className="text-indigo-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Feature {i}
                </h3>
                <p className="text-gray-600">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                  Sed do eiusmod tempor incididunt ut labore.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Section 2 - Animation Test */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                Animation Performance Test
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Diese Animationen laufen kontinuierlich. Wenn du das Overlay öffnest, 
                sollten sie pausiert werden um Performance-Konflikte zu vermeiden.
              </p>
              
              {/* Test Overlay Button */}
              <button
                onClick={() => setIsOverlayOpen(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3"
              >
                <Headphones size={24} />
                Overlay Modal testen
              </button>
            </div>

            <div className="lg:w-1/2">
              {/* Animated Elements */}
              <div className="relative">
                <div className="w-64 h-64 mx-auto">
                  {/* Rotating Circles */}
                  <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-spin" />
                  <div className="absolute inset-4 border-4 border-purple-300 rounded-full animate-spin animate-reverse" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-8 border-4 border-pink-300 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                  
                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                      <Music size={32} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section 3 - Long Content for Scroll Testing */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
            Scroll Position Test
          </h2>
          
          <div className="space-y-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Content Block {i + 1}
                </h3>
                <p className="text-gray-600">
                  Current Scroll Position: <span className="font-mono text-indigo-600">{Math.round(scrollY)}px</span>
                </p>
                <p className="text-gray-600 mt-2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
                  veniam, quis nostrud exercitation ullamco laboris.
                </p>
                
                {i === 4 && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-indigo-800 font-medium mb-3">
                      🎯 Test Point: Öffne hier das Overlay Modal
                    </p>
                    <button
                      onClick={() => setIsOverlayOpen(true)}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Play size={20} />
                      Modal öffnen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white text-center">
        <p className="text-gray-400">
          SoundAngeles Overlay Modal Demo - Scroll zurück nach oben und teste erneut
        </p>
      </footer>

      {/* Overlay Modal Demo */}
      <OverlayDemo 
        isOpen={isOverlayOpen} 
        onClose={() => setIsOverlayOpen(false)} 
      />
    </>
  );
};

export default SmoothScrollDemo;