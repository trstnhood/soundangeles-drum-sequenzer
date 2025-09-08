import React, { useState } from 'react';
import { Play, Music, Headphones, Download, Star, CheckCircle } from 'lucide-react';
import OverlayDemo from './OverlayDemo';

const LandingPage: React.FC = () => {
  const [isSequencerOpen, setIsSequencerOpen] = useState(false);

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-6 max-w-5xl">
          
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              SoundAngeles
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
              Professional Sample Packs mit revolutionärem Browser Sequencer
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {['Premium Quality', 'Try Before Buy', 'MIDI Export', 'Pattern Banks'].map((feature, i) => (
                <span key={i} className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Main CTA */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            
            {/* Primary Button - Opens Sequencer Overlay */}
            <button
              onClick={() => setIsSequencerOpen(true)}
              className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 transition-all duration-300 flex items-center gap-4"
            >
              <Play size={28} className="group-hover:scale-110 transition-transform" />
              🎵 Sample Packs testen
            </button>
            
            {/* Secondary Button */}
            <button className="border-2 border-white/30 text-white px-10 py-5 rounded-2xl text-xl font-bold hover:bg-white/10 transition-all duration-300 flex items-center gap-4">
              <Download size={24} />
              Alle Packs ansehen
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-purple-200">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400 fill-current" size={20} />
              <span className="text-sm">Professional Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={20} />
              <span className="text-sm">Instant Download</span>
            </div>
            <div className="flex items-center gap-2">
              <Music className="text-purple-300" size={20} />
              <span className="text-sm">Royalty Free</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Warum SoundAngeles Sample Packs?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Der erste Sample Pack Store mit integriertem Browser Sequencer. 
              Teste jedes Sample bevor du kaufst.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Play size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Try Before Buy</h3>
              <p className="text-gray-600">
                Lade jeden Sample in unseren Browser Sequencer und teste komplette Beats 
                bevor du kaufst.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Music size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Professional Quality</h3>
              <p className="text-gray-600">
                Handverlesene Sample Packs von professionellen Produzenten. 
                Jeder Sample in Studio-Qualität.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-pink-50 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full flex items-center justify-center">
                <Download size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">MIDI Export</h3>
              <p className="text-gray-600">
                Exportiere deine Patterns als MIDI Files direkt aus dem Sequencer 
                in deine DAW.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <button
              onClick={() => setIsSequencerOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-6 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-4 mx-auto"
            >
              <Headphones size={28} />
              Jetzt Sequencer ausprobieren
            </button>
            <p className="text-gray-500 mt-4">
              Kostenlos • Kein Download • Sofort verfügbar
            </p>
          </div>
        </div>
      </section>

      {/* Sample Packs Preview */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Featured Sample Packs
            </h2>
            <p className="text-xl text-gray-600">
              Entdecke unsere handverlesenen Sample Collections
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {[
              { name: 'I.L.L. Will Vol. 1', tracks: '8 Tracks', price: '€14.99', genre: 'Hip Hop' },
              { name: 'I.L.L. Will Vol. 2', tracks: '10 Tracks', price: '€16.99', genre: 'Boom Bap' },
              { name: 'I.L.L. Will Vol. 3', tracks: '10 Tracks', price: '€16.99', genre: 'Trap' }
            ].map((pack, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
                  <Music size={64} className="text-white" />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{pack.name}</h3>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {pack.genre}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{pack.tracks} • Professional Quality</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-gray-800">{pack.price}</span>
                    <button
                      onClick={() => setIsSequencerOpen(true)}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Play size={16} />
                      Testen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-2xl font-bold mb-4">SoundAngeles</h3>
          <p className="text-gray-400 mb-6">
            Professional Sample Packs • Browser Sequencer • Try Before Buy
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-400">
            <span>Premium Quality</span>
            <span>Instant Download</span>
            <span>Royalty Free</span>
            <span>MIDI Export</span>
          </div>
        </div>
      </footer>

      {/* Sequencer Overlay Modal - NUR HIER wird der Sequencer geladen */}
      <OverlayDemo 
        isOpen={isSequencerOpen} 
        onClose={() => setIsSequencerOpen(false)} 
      />
    </>
  );
};

export default LandingPage;