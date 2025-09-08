/**
 * SoundAngeles-Drum-Sequenzer JavaScript Library
 * 
 * Usage:
 * const sequencer = new DrumSequencer('#container', {
 *   bpm: 120,
 *   selectedKit: 'classic-808',
 *   darkMode: false
 * });
 */

class DrumSequencer {
  constructor(containerSelector, options = {}) {
    this.container = typeof containerSelector === 'string' 
      ? document.querySelector(containerSelector) 
      : containerSelector;
    
    if (!this.container) {
      throw new Error('Container element not found');
    }

    // Default options
    this.options = {
      bpm: 120,
      selectedKit: 'classic-808',
      darkMode: false,
      ...options
    };

    // State
    this.tracks = this.getInitialTracks();
    this.isPlaying = false;
    this.currentStep = 0;
    this.bpm = this.options.bpm;
    this.selectedKit = this.options.selectedKit;
    this.isDarkMode = this.options.darkMode;
    this.audioLevels = {};

    // Audio references
    this.audioContext = null;
    this.intervalRef = null;
    this.nextStepTime = 0;
    this.activeOscillators = [];
    this.analyserNodes = {};

    this.init();
  }

  // Sample kits data
  getSampleKits() {
    return [
      {
        id: 'classic-808',
        name: '808 Classic Pack',
        description: 'Vintage 808 drum machine sounds',
        samples: {
          kick: [
            { id: '808-kick-1', name: '808 Kick Deep', freq: 60, type: 'sine', duration: 0.4, preset: '808-kick-1' },
            { id: '808-kick-2', name: '808 Kick Punch', freq: 65, type: 'sine', duration: 0.35, preset: '808-kick-2' },
            { id: '808-kick-3', name: '808 Kick Sub', freq: 55, type: 'sine', duration: 0.5, preset: '808-kick-3' }
          ],
          snare: [
            { id: '808-snare-1', name: '808 Snare Classic', freq: 200, type: 'sawtooth', duration: 0.25, preset: '808-snare-1' },
            { id: '808-snare-2', name: '808 Snare Crisp', freq: 220, type: 'sawtooth', duration: 0.2, preset: '808-snare-2' },
            { id: '808-snare-3', name: '808 Snare Tight', freq: 180, type: 'square', duration: 0.15, preset: '808-snare-3' }
          ],
          hihat: [
            { id: '808-hihat-1', name: '808 HiHat Closed', freq: 8000, type: 'square', duration: 0.08, preset: '808-hihat-1' },
            { id: '808-hihat-2', name: '808 HiHat Sharp', freq: 9000, type: 'square', duration: 0.06, preset: '808-hihat-2' },
            { id: '808-hihat-3', name: '808 HiHat Soft', freq: 7000, type: 'triangle', duration: 0.1, preset: '808-hihat-3' }
          ],
          openhat: [
            { id: '808-openhat-1', name: '808 Open Hat Long', freq: 6000, type: 'square', duration: 0.35, preset: '808-openhat-1' },
            { id: '808-openhat-2', name: '808 Open Hat Medium', freq: 6500, type: 'sawtooth', duration: 0.25, preset: '808-openhat-2' }
          ],
          crash: [
            { id: '808-crash-1', name: '808 Crash Big', freq: 3000, type: 'sawtooth', duration: 0.6, preset: '808-crash-1' },
            { id: '808-crash-2', name: '808 Crash Splash', freq: 3500, type: 'square', duration: 0.4, preset: '808-crash-2' }
          ],
          clap: [
            { id: '808-clap-1', name: '808 Clap Standard', freq: 1000, type: 'square', duration: 0.18, preset: '808-clap-1' },
            { id: '808-clap-2', name: '808 Clap Wide', freq: 1100, type: 'sawtooth', duration: 0.22, preset: '808-clap-2' }
          ]
        }
      },
      {
        id: 'trap-pack',
        name: 'Trap Beats Vol.1',
        description: 'Modern trap and hip-hop drums',
        samples: {
          kick: [
            { id: 'trap-kick-1', name: 'Trap Kick Heavy', freq: 45, type: 'sine', duration: 0.5, preset: 'trap-kick-1' },
            { id: 'trap-kick-2', name: 'Trap Kick Boomy', freq: 40, type: 'sine', duration: 0.6, preset: 'trap-kick-2' },
            { id: 'trap-kick-3', name: 'Trap Kick Tight', freq: 50, type: 'sine', duration: 0.4, preset: 'trap-kick-3' }
          ],
          snare: [
            { id: 'trap-snare-1', name: 'Trap Snare Loud', freq: 250, type: 'sawtooth', duration: 0.3, preset: 'trap-snare-1' },
            { id: 'trap-snare-2', name: 'Trap Snare Clap', freq: 280, type: 'square', duration: 0.25, preset: 'trap-snare-2' },
            { id: 'trap-snare-3', name: 'Trap Snare Rim', freq: 220, type: 'triangle', duration: 0.2, preset: 'trap-snare-3' }
          ],
          hihat: [
            { id: 'trap-hihat-1', name: 'Trap HiHat Fast', freq: 12000, type: 'square', duration: 0.06, preset: 'trap-hihat-1' },
            { id: 'trap-hihat-2', name: 'Trap HiHat Metallic', freq: 13000, type: 'sawtooth', duration: 0.05, preset: 'trap-hihat-2' },
            { id: 'trap-hihat-3', name: 'Trap HiHat Dark', freq: 11000, type: 'triangle', duration: 0.08, preset: 'trap-hihat-3' }
          ],
          openhat: [
            { id: 'trap-openhat-1', name: 'Trap Open Sizzle', freq: 8000, type: 'square', duration: 0.25, preset: 'trap-openhat-1' },
            { id: 'trap-openhat-2', name: 'Trap Open Wide', freq: 7500, type: 'sawtooth', duration: 0.3, preset: 'trap-openhat-2' }
          ],
          crash: [
            { id: 'trap-crash-1', name: 'Trap Crash Heavy', freq: 4000, type: 'sawtooth', duration: 0.8, preset: 'trap-crash-1' },
            { id: 'trap-crash-2', name: 'Trap Crash Dark', freq: 3500, type: 'square', duration: 0.6, preset: 'trap-crash-2' }
          ],
          clap: [
            { id: 'trap-clap-1', name: 'Trap Clap Big', freq: 1200, type: 'square', duration: 0.2, preset: 'trap-clap-1' },
            { id: 'trap-clap-2', name: 'Trap Clap Reverb', freq: 1300, type: 'sawtooth', duration: 0.25, preset: 'trap-clap-2' }
          ]
        }
      },
      {
        id: 'techno-pack',
        name: 'Techno Underground',
        description: 'Dark techno and industrial sounds',
        samples: {
          kick: [
            { id: 'techno-kick-1', name: 'Techno Kick Hard', freq: 80, type: 'sine', duration: 0.3, preset: 'techno-kick-1' },
            { id: 'techno-kick-2', name: 'Techno Kick Industrial', freq: 75, type: 'square', duration: 0.25, preset: 'techno-kick-2' },
            { id: 'techno-kick-3', name: 'Techno Kick Deep', freq: 70, type: 'sine', duration: 0.35, preset: 'techno-kick-3' }
          ],
          snare: [
            { id: 'techno-snare-1', name: 'Techno Snare Sharp', freq: 180, type: 'sawtooth', duration: 0.15, preset: 'techno-snare-1' },
            { id: 'techno-snare-2', name: 'Techno Snare Noise', freq: 200, type: 'square', duration: 0.12, preset: 'techno-snare-2' },
            { id: 'techno-snare-3', name: 'Techno Snare Metal', freq: 160, type: 'triangle', duration: 0.18, preset: 'techno-snare-3' }
          ],
          hihat: [
            { id: 'techno-hihat-1', name: 'Techno HiHat Bright', freq: 15000, type: 'square', duration: 0.05, preset: 'techno-hihat-1' },
            { id: 'techno-hihat-2', name: 'Techno HiHat Industrial', freq: 16000, type: 'sawtooth', duration: 0.04, preset: 'techno-hihat-2' },
            { id: 'techno-hihat-3', name: 'Techno HiHat Filtered', freq: 14000, type: 'triangle', duration: 0.06, preset: 'techno-hihat-3' }
          ],
          openhat: [
            { id: 'techno-openhat-1', name: 'Techno Open Industrial', freq: 10000, type: 'square', duration: 0.2, preset: 'techno-openhat-1' },
            { id: 'techno-openhat-2', name: 'Techno Open Noise', freq: 11000, type: 'sawtooth', duration: 0.18, preset: 'techno-openhat-2' }
          ],
          crash: [
            { id: 'techno-crash-1', name: 'Techno Crash Dark', freq: 5000, type: 'sawtooth', duration: 0.4, preset: 'techno-crash-1' },
            { id: 'techno-crash-2', name: 'Techno Crash Noise', freq: 4500, type: 'square', duration: 0.5, preset: 'techno-crash-2' }
          ],
          clap: [
            { id: 'techno-clap-1', name: 'Techno Clap Tight', freq: 800, type: 'square', duration: 0.12, preset: 'techno-clap-1' },
            { id: 'techno-clap-2', name: 'Techno Clap Reverb', freq: 900, type: 'sawtooth', duration: 0.15, preset: 'techno-clap-2' }
          ]
        }
      }
    ];
  }

  generateDynamicTracks() {
    const sampleFolders = [
      'kick-drums', 'snares', 'hi-hats', 'open-hi-hats', 'hand-claps', 
      'ride', 'rimshot', 'various-percussions', 'crash'
    ];
    
    // Unterstützung für nummerierte Ordner (z.B. "01-kick-drums", "02-snares")
    const sortedFolders = sampleFolders.sort((a, b) => {
      // Extrahiere Zahlen-Präfix falls vorhanden
      const getOrderNumber = (folder) => {
        const match = folder.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) : 999; // Ordner ohne Nummer kommen ans Ende
      };
      
      const orderA = getOrderNumber(a);
      const orderB = getOrderNumber(b);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Falls keine Zahlen oder gleiche Zahlen, alphabetisch sortieren
      return a.localeCompare(b);
    });
    
    const folderColors = [
      '#00ffff', '#00ff00', '#ff0080', '#00ffff', 
      '#ffff00', '#8000ff', '#ff8000', '#ff0000',
      '#8080ff', '#00ff80', '#80ff00', '#ff0040'
    ];
    
    const tracks = [];
    
    for (let i = 0; i < sortedFolders.length; i++) {
      const folder = sortedFolders[i];
      
      // Entferne Zahlen-Präfix für trackId und displayName
      const cleanFolder = folder.replace(/^\d+-/, '');
      const trackId = cleanFolder.replace('-', ''); // z.B. 'kick-drums' wird zu 'kickdrums'
      
      // Erstelle Display-Namen: entferne Zahlen-Präfix und formatiere
      const displayName = cleanFolder.toUpperCase().replace('-', ' '); // z.B. 'KICK DRUMS'
      const color = folderColors[i % folderColors.length];
      
      // Ersten verfügbaren Sample für diesen Track finden
      const currentKit = this.getSampleKits()[0]; // Default kit für initial sample
      const folderMapping = {
        'kickdrums': 'kick',
        'snares': 'snare', 
        'hihats': 'hihat',
        'openhihats': 'openhat',
        'handclaps': 'clap',
        'ride': 'ride',
        'rimshot': 'rimshot',
        'variouspercussions': 'percussion',
        'crash': 'crash'
      };
      
      const kitCategory = folderMapping[trackId] || 'kick';
      const availableSamples = currentKit.samples[kitCategory] || currentKit.samples.kick || [];
      const defaultSampleId = availableSamples[0]?.id || '808-kick-1';
      
      tracks.push({
        id: trackId,
        name: displayName,
        color: color,
        steps: new Array(16).fill(false),
        volume: 0.7,
        selectedSampleId: defaultSampleId
      });
    }
    
    return tracks;
  }

  getInitialTracks() {
    return this.generateDynamicTracks();
  }

  async init() {
    await this.initializeAudio();
    this.setupTheme();
    this.render();
    this.attachEventListeners();
  }

  async initializeAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Initialize analyser nodes for each track
    this.tracks.forEach(track => {
      const analyser = this.audioContext.createAnalyser();
      const gainNode = this.audioContext.createGain();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      gainNode.connect(analyser);
      analyser.connect(this.audioContext.destination);
      
      this.analyserNodes[track.id] = { analyser, gainNode, dataArray };
    });
  }

  setupTheme() {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  render() {
    const styles = `
      <style>
        .drum-sequencer {
          min-height: 100vh;
          background: ${this.isDarkMode ? '#0a0a0a' : '#ffffff'};
          color: ${this.isDarkMode ? '#ffffff' : '#000000'};
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .sequencer-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .kit-selector-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin: 24px 0;
          flex-wrap: wrap;
        }
        .kit-cover {
          width: 192px;
          height: 192px;
          border-radius: 8px;
          border: 2px solid ${this.isDarkMode ? '#333' : '#ccc'};
          background: ${this.isDarkMode ? '#1a1a1a' : '#f5f5f5'};
          overflow: hidden;
          flex-shrink: 0;
        }
        .kit-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .kit-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          flex: 1;
          max-width: 320px;
        }
        .kit-selector {
          width: 100%;
          padding: 12px;
          border: 1px solid ${this.isDarkMode ? '#333' : '#ccc'};
          border-radius: 6px;
          background: ${this.isDarkMode ? '#1a1a1a' : '#ffffff'};
          color: ${this.isDarkMode ? '#ffffff' : '#000000'};
          font-size: 16px;
        }
        .transport-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px;
          background: ${this.isDarkMode ? '#1a1a1a' : '#f8f9fa'};
          border-radius: 12px;
          border: 1px solid ${this.isDarkMode ? '#333' : '#e1e5e9'};
          margin-bottom: 32px;
        }
        .control-button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          background: ${this.isDarkMode ? '#333' : '#007bff'};
          color: white;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .control-button:hover {
          background: ${this.isDarkMode ? '#444' : '#0056b3'};
        }
        .control-button.active {
          background: #00ff00;
          color: #000;
        }
        .control-button.stop {
          background: #ff4444;
        }
        .bpm-control {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bpm-slider {
          width: 128px;
        }
        .step-indicators {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        .beat-indicators {
          display: flex;
          gap: 16px;
        }
        .beat-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .beat-number {
          font-size: 12px;
          font-weight: bold;
          color: ${this.isDarkMode ? '#888' : '#666'};
        }
        .step-indicator {
          width: 32px;
          height: 12px;
          border-radius: 2px;
          background: ${this.isDarkMode ? '#333' : '#ddd'};
          margin: 1px;
          transition: all 0.1s;
        }
        .step-indicator.current {
          background: #00ff00;
          box-shadow: 0 0 10px #00ff00;
        }
        .step-indicator.beat-start {
          background: rgba(0, 255, 255, 0.3);
          border: 1px solid rgba(0, 255, 255, 0.5);
        }
        .tracks-container {
          margin-bottom: 32px;
        }
        .track {
          margin-bottom: 24px;
        }
        .track-info {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .track-name {
          font-weight: bold;
          font-size: 14px;
          min-width: 60px;
        }
        .sample-selector {
          min-width: 200px;
          padding: 8px;
          border: 1px solid ${this.isDarkMode ? '#333' : '#ccc'};
          border-radius: 4px;
          background: ${this.isDarkMode ? '#1a1a1a' : '#ffffff'};
          color: ${this.isDarkMode ? '#ffffff' : '#000000'};
        }
        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .volume-slider {
          width: 80px;
        }
        .steps-grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .step-button {
          width: 40px;
          height: 40px;
          border: 2px solid ${this.isDarkMode ? '#333' : '#ccc'};
          border-radius: 6px;
          background: ${this.isDarkMode ? '#1a1a1a' : '#ffffff'};
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .step-button:hover {
          border-color: ${this.isDarkMode ? '#555' : '#888'};
        }
        .step-button.active {
          border-color: #00ff00;
          background: rgba(0, 255, 0, 0.8);
        }
        .step-button.playing {
          box-shadow: 0 0 12px rgba(0, 255, 0, 0.6);
        }
        .step-button.beat-start {
          border-color: rgba(0, 255, 255, 0.5);
        }
        .footer {
          text-align: center;
          color: ${this.isDarkMode ? '#888' : '#666'};
          margin-top: 32px;
        }
        @media (max-width: 768px) {
          .kit-selector-area {
            flex-direction: column;
          }
          .kit-cover {
            width: 128px;
            height: 128px;
          }
          .transport-controls {
            gap: 8px;
            padding: 16px;
          }
          .control-button {
            padding: 8px 16px;
            font-size: 14px;
          }
          .track-info {
            flex-direction: column;
            align-items: flex-start;
          }
          .steps-grid {
            gap: 8px;
          }
          .step-button {
            width: 32px;
            height: 32px;
          }
        }
      </style>
    `;

    const currentKit = this.getSampleKits().find(kit => kit.id === this.selectedKit) || this.getSampleKits()[0];

    this.container.innerHTML = styles + `
      <div class="drum-sequencer">
        <div class="sequencer-container">
          <!-- Header -->
          <div class="header">
            <button id="theme-toggle" class="control-button" style="position: absolute; top: 20px; right: 20px;">
              ${this.isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <!-- Kit Selector -->
            <div class="kit-selector-area">
              <div class="kit-cover">
                <img src="/sample-packs/${this.selectedKit}.png" 
                     alt="${currentKit.name} Cover"
                     onerror="this.src='/sample-packs/default-cover.png'">
              </div>
              <div class="kit-info">
                <h3>Wähle dein Sample Pack:</h3>
                <select id="kit-selector" class="kit-selector">
                  ${this.getSampleKits().map(kit => 
                    `<option value="${kit.id}" ${kit.id === this.selectedKit ? 'selected' : ''}>${kit.name}</option>`
                  ).join('')}
                </select>
                <p>${currentKit.description}</p>
              </div>
            </div>
          </div>

          <!-- Transport Controls -->
          <div class="transport-controls">
            <button id="play-pause" class="control-button ${this.isPlaying ? 'active' : ''}">
              ${this.isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
            </button>
            <button id="stop" class="control-button stop">⏹️ STOP</button>
            <button id="clear" class="control-button">🔄 CLEAR</button>
            
            <div class="bpm-control">
              <span>BPM</span>
              <input type="range" id="bpm-slider" class="bpm-slider" 
                     min="60" max="180" value="${this.bpm}">
              <span id="bpm-display">${this.bpm}</span>
            </div>
          </div>

          <!-- Step Indicators -->
          <div class="step-indicators">
            <div class="beat-indicators">
              ${Array.from({ length: 4 }, (_, beat) => `
                <div class="beat-group">
                  <div class="beat-number">${beat + 1}</div>
                  <div class="steps-row">
                    ${Array.from({ length: 4 }, (_, step) => {
                      const stepIndex = beat * 4 + step;
                      return `<div class="step-indicator ${stepIndex === this.currentStep && this.isPlaying ? 'current' : ''} ${step === 0 ? 'beat-start' : ''}" data-step="${stepIndex}"></div>`;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Tracks -->
          <div class="tracks-container">
            ${this.tracks.map(track => `
              <div class="track" data-track="${track.id}">
                <div class="track-info">
                  <div class="track-name" style="color: ${track.color}">${track.name}</div>
                  
                  <select class="sample-selector" data-track="${track.id}">
                    ${this.getCurrentKitSamples(track.id).map(sample => 
                      `<option value="${sample.id}" ${sample.id === track.selectedSampleId ? 'selected' : ''}>${sample.name}</option>`
                    ).join('')}
                  </select>
                  
                  <div class="volume-control">
                    <label>VOL</label>
                    <input type="range" class="volume-slider" 
                           min="0" max="100" value="${Math.round(track.volume * 100)}"
                           data-track="${track.id}">
                    <span class="volume-value">${Math.round(track.volume * 100)}</span>
                  </div>
                </div>
                
                <div class="steps-grid">
                  ${Array.from({ length: 16 }, (_, stepIndex) => `
                    <button class="step-button ${track.steps[stepIndex] ? 'active' : ''} ${stepIndex === this.currentStep && this.isPlaying ? 'playing' : ''} ${stepIndex % 4 === 0 ? 'beat-start' : ''}"
                            data-track="${track.id}" data-step="${stepIndex}"
                            style="${track.steps[stepIndex] ? `border-color: ${track.color}; background: ${track.color}88;` : ''}">
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>Click the grid to program your beats • Use transport controls to play</p>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Transport controls
    document.getElementById('play-pause')?.addEventListener('click', () => {
      this.togglePlayback();
    });

    document.getElementById('stop')?.addEventListener('click', () => {
      this.stopPlayback();
    });

    document.getElementById('clear')?.addEventListener('click', () => {
      this.clearPattern();
    });

    // BPM control
    const bpmSlider = document.getElementById('bpm-slider');
    bpmSlider?.addEventListener('input', (e) => {
      this.setBpm(parseInt(e.target.value));
    });

    // Kit selector
    document.getElementById('kit-selector')?.addEventListener('change', (e) => {
      this.setSelectedKit(e.target.value);
    });

    // Step buttons
    document.querySelectorAll('.step-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const trackId = e.target.dataset.track;
        const stepIndex = parseInt(e.target.dataset.step);
        this.toggleStep(trackId, stepIndex);
      });
    });

    // Sample selectors
    document.querySelectorAll('.sample-selector').forEach(select => {
      select.addEventListener('change', (e) => {
        const trackId = e.target.dataset.track;
        this.updateTrackSample(trackId, e.target.value);
      });
    });

    // Volume sliders
    document.querySelectorAll('.volume-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const trackId = e.target.dataset.track;
        this.updateTrackVolume(trackId, parseInt(e.target.value));
      });
    });
  }

  getCurrentKitSamples(trackId) {
    const currentKit = this.getSampleKits().find(kit => kit.id === this.selectedKit) || this.getSampleKits()[0];
    
    // Mapping für Track-ID zu Kit-Kategorie
    const trackToKitMapping = {
      'kickdrums': 'kick',
      'snares': 'snare', 
      'hihats': 'hihat',
      'openhihats': 'openhat',
      'handclaps': 'clap',
      'ride': 'ride',
      'rimshot': 'rimshot',
      'variouspercussions': 'percussion',
      'crash': 'crash'
    };
    
    const kitCategory = trackToKitMapping[trackId] || trackId;
    return currentKit.samples[kitCategory] || currentKit.samples.kick || [];
  }

  // Control methods
  togglePlayback() {
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      this.startSequencer();
    } else {
      this.pauseSequencer();
    }
    
    this.updateUI();
  }

  stopPlayback() {
    this.isPlaying = false;
    this.currentStep = 0;
    this.stopAllOscillators();
    this.clearInterval();
    this.nextStepTime = 0;
    this.updateUI();
  }

  clearPattern() {
    this.tracks.forEach(track => {
      track.steps = new Array(16).fill(false);
    });
    this.currentStep = 0;
    this.updateUI();
  }

  setBpm(bpm) {
    this.bpm = bpm;
    document.getElementById('bpm-display').textContent = bpm;
  }

  setSelectedKit(kitId) {
    this.selectedKit = kitId;
    // Update default samples for tracks
    this.tracks.forEach(track => {
      const samples = this.getCurrentKitSamples(track.id);
      if (samples.length > 0) {
        track.selectedSampleId = samples[0].id;
      }
    });
    this.render();
    this.attachEventListeners();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.setupTheme();
    this.render();
    this.attachEventListeners();
  }

  toggleStep(trackId, stepIndex) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.steps[stepIndex] = !track.steps[stepIndex];
      this.updateStepButton(trackId, stepIndex);
    }
  }

  updateTrackVolume(trackId, volume) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.volume = volume / 100;
      // Update display
      const slider = document.querySelector(`[data-track="${trackId}"].volume-slider`);
      const display = slider?.parentElement.querySelector('.volume-value');
      if (display) display.textContent = volume;
    }
  }

  updateTrackSample(trackId, sampleId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.selectedSampleId = sampleId;
    }
  }

  // Audio methods
  startSequencer() {
    if (!this.audioContext) return;
    
    this.nextStepTime = this.audioContext.currentTime;
    this.scheduleStep();
  }

  pauseSequencer() {
    this.clearInterval();
  }

  scheduleStep() {
    if (!this.isPlaying || !this.audioContext) return;
    
    const stepDuration = (60 / this.bpm / 4); // 16th notes
    
    // Play current step
    this.tracks.forEach(track => {
      if (track.steps[this.currentStep]) {
        this.playDrumSound(track, this.nextStepTime);
      }
    });
    
    // Schedule next step
    this.nextStepTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
    
    // Update UI
    this.updateCurrentStepIndicator();
    
    // Schedule next step
    const timeUntilNext = (this.nextStepTime - this.audioContext.currentTime) * 1000;
    this.intervalRef = setTimeout(() => this.scheduleStep(), Math.max(1, timeUntilNext - 10));
  }

  clearInterval() {
    if (this.intervalRef) {
      clearTimeout(this.intervalRef);
      this.intervalRef = null;
    }
  }

  playDrumSound(track, scheduledTime) {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Get current sample
    const samples = this.getCurrentKitSamples(track.id);
    const sound = samples.find(sample => sample.id === track.selectedSampleId) || samples[0];
    
    if (!sound) return;
    
    const startTime = scheduledTime || ctx.currentTime;
    
    oscillator.frequency.setValueAtTime(sound.freq, startTime);
    oscillator.type = sound.type;
    
    gainNode.gain.setValueAtTime(track.volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + sound.duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    this.activeOscillators.push(oscillator);
    
    oscillator.addEventListener('ended', () => {
      const index = this.activeOscillators.indexOf(oscillator);
      if (index > -1) {
        this.activeOscillators.splice(index, 1);
      }
    });
    
    oscillator.start(startTime);
    oscillator.stop(startTime + sound.duration);
  }

  stopAllOscillators() {
    this.activeOscillators.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (e) {
        // Ignore errors from already stopped oscillators
      }
    });
    this.activeOscillators = [];
  }

  // UI update methods
  updateUI() {
    // Update play/pause button
    const playButton = document.getElementById('play-pause');
    if (playButton) {
      playButton.textContent = this.isPlaying ? '⏸️ PAUSE' : '▶️ PLAY';
      playButton.classList.toggle('active', this.isPlaying);
    }
    
    this.updateCurrentStepIndicator();
  }

  updateCurrentStepIndicator() {
    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
      indicator.classList.toggle('current', index === this.currentStep && this.isPlaying);
    });
    
    // Update step buttons
    document.querySelectorAll('.step-button').forEach(button => {
      const stepIndex = parseInt(button.dataset.step);
      button.classList.toggle('playing', stepIndex === this.currentStep && this.isPlaying);
    });
  }

  updateStepButton(trackId, stepIndex) {
    const track = this.tracks.find(t => t.id === trackId);
    const button = document.querySelector(`[data-track="${trackId}"][data-step="${stepIndex}"]`);
    
    if (button && track) {
      const isActive = track.steps[stepIndex];
      button.classList.toggle('active', isActive);
      
      if (isActive) {
        button.style.borderColor = track.color;
        button.style.background = track.color + '88';
      } else {
        button.style.borderColor = '';
        button.style.background = '';
      }
    }
  }

  // Public API methods
  play() {
    if (!this.isPlaying) {
      this.togglePlayback();
    }
  }

  pause() {
    if (this.isPlaying) {
      this.togglePlayback();
    }
  }

  stop() {
    this.stopPlayback();
  }

  clear() {
    this.clearPattern();
  }

  setPattern(trackId, pattern) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && Array.isArray(pattern) && pattern.length === 16) {
      track.steps = [...pattern];
      this.updateUI();
    }
  }

  getPattern(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    return track ? [...track.steps] : null;
  }

  exportPattern() {
    return {
      tracks: this.tracks.map(track => ({
        id: track.id,
        name: track.name,
        steps: [...track.steps],
        volume: track.volume,
        selectedSampleId: track.selectedSampleId
      })),
      bpm: this.bpm,
      selectedKit: this.selectedKit
    };
  }

  importPattern(pattern) {
    if (pattern.tracks) {
      pattern.tracks.forEach(importedTrack => {
        const track = this.tracks.find(t => t.id === importedTrack.id);
        if (track) {
          track.steps = [...importedTrack.steps];
          track.volume = importedTrack.volume;
          track.selectedSampleId = importedTrack.selectedSampleId;
        }
      });
    }
    
    if (pattern.bpm) {
      this.setBpm(pattern.bpm);
    }
    
    if (pattern.selectedKit) {
      this.setSelectedKit(pattern.selectedKit);
    }
    
    this.updateUI();
  }

  destroy() {
    this.stopPlayback();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.container.innerHTML = '';
  }
}

// Make it available globally
window.DrumSequencer = DrumSequencer;

// CommonJS/ES Module support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrumSequencer;
}