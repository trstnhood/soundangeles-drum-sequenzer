/**
 * Professional Audio Engine - ZERO SYNTHESIS, ONLY REAL SAMPLES
 * Isolated from React - Professional drum machine behavior
 */

export interface TrackPattern {
  id: string;
  name: string;
  steps: boolean[];
  volume: number;
  selectedSampleId: string;
  muted: boolean;
  groove?: GrooveDot[]; // Optional: Groove timing data (16 dots per track)
}

export interface GrooveDot {
  stepIndex: number;
  offsetPercent: number; // -50% to +50% (rushed to laid-back)
  offsetMs: number; // Calculated milliseconds offset
}

export interface SampleData {
  id: string;
  name: string;
  audioFile: string;
  buffer?: AudioBuffer;
}

export class ProfessionalAudioEngine {
  private audioContext: AudioContext;
  private tracks: Map<string, TrackPattern> = new Map();
  private sampleCache: Map<string, AudioBuffer> = new Map();
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private bpm: number = 100;
  private nextStepTime: number = 0;
  private schedulerInterval: number | null = null;
  
  // 🚀 LAZY LOADING SYSTEM
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private samplePaths: Map<string, string> = new Map(); // trackId -> sample path
  private pendingLoads: Set<string> = new Set(); // Track which samples are currently loading
  
  // 🛡️ DOUBLE-TRIGGERING PREVENTION
  private activeSources: Map<string, AudioBufferSourceNode[]> = new Map();
  private scheduledEvents: Map<string, number> = new Map();
  
  // Professional timing constants - MOBILE OPTIMIZED
  private readonly LOOKAHEAD_TIME = 25.0; // Check every 25ms
  private readonly SCHEDULE_AHEAD_TIME: number; // Dynamic based on device
  
  // Mobile optimization
  private readonly MAX_SIMULTANEOUS_SAMPLES = 8;
  private isMobile: boolean = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  constructor() {
    // 🎯 UNIFIED 48kHz: All samples are now 48kHz - force consistent rate
    this.audioContext = new AudioContext({
      latencyHint: 'interactive',
      sampleRate: 48000 // Match sample rate exactly
    });
    
    // 🍎 iOS Safari Detection
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        /Safari/.test(navigator.userAgent) && 
                        !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);
    
    // Device-optimized settings for 48kHz
    if (isIOSSafari) {
      this.SCHEDULE_AHEAD_TIME = 0.15; // 150ms for iOS Safari
      console.log('🍎 iOS Safari: 48kHz unified, 150ms lookahead');
    } else {
      this.SCHEDULE_AHEAD_TIME = this.isMobile ? 0.05 : 0.08; // 50ms mobile, 80ms desktop
      console.log(`💻 ${this.isMobile ? 'Mobile' : 'Desktop'}: 48kHz unified, ${this.SCHEDULE_AHEAD_TIME * 1000}ms lookahead`);
    }
    
    console.log(`🎯 UNIFIED AUDIO: Forced 48kHz, actual: ${this.audioContext.sampleRate}Hz`);
  }

  /**
   * Initialize tracks with pattern data
   */
  initializeTracks(tracks: TrackPattern[]): void {
    console.log(`🎛️ Initializing ${tracks.length} tracks in audio engine`);
    
    this.tracks.clear();
    tracks.forEach(track => {
      this.tracks.set(track.id, {
        ...track,
        steps: [...track.steps] // Deep copy array
      });
    });
    
    console.log(`✅ Audio engine initialized with tracks: ${Array.from(this.tracks.keys()).join(', ')}`);
  }

  /**
   * Load audio sample into cache - BULLETPROOF LOADING with SECURE URL SUPPORT
   */
  async loadSample(sampleIdOrUrl: string): Promise<AudioBuffer | null> {
    // Return cached if available
    if (this.sampleCache.has(sampleIdOrUrl)) {
      return this.sampleCache.get(sampleIdOrUrl)!;
    }

    console.log(`🔄 Loading sample: ${sampleIdOrUrl}`);

    try {
      // 🔒 SECURE URL HANDLING: Check if this is a secure ID or regular URL
      let fetchUrl = sampleIdOrUrl;
      
      if (sampleIdOrUrl.startsWith('s_')) {
        // Secure ID detected - use secure endpoint
        fetchUrl = `/api/secure-sample?id=${encodeURIComponent(sampleIdOrUrl)}`;
        console.log(`🔒 Using secure endpoint for ID: ${sampleIdOrUrl}`);
      } else if (!sampleIdOrUrl.startsWith('http') && !sampleIdOrUrl.startsWith('/')) {
        // Legacy relative URL - convert to absolute
        fetchUrl = `/${sampleIdOrUrl}`;
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(fetchUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} for ${fetchUrl}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Cache using original identifier (secure ID or URL)
      this.sampleCache.set(sampleIdOrUrl, audioBuffer);
      
      // CRITICAL FIX: Register sampleId -> samplePath mapping for lazy loading
      this.samplePaths.set(sampleIdOrUrl, sampleIdOrUrl);
      
      console.log(`✅ Sample loaded: ${sampleIdOrUrl.includes('/') ? sampleIdOrUrl.split('/').pop() : sampleIdOrUrl} (${audioBuffer.duration.toFixed(2)}s)`);
      return audioBuffer;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`⏱️ Timeout loading: ${sampleIdOrUrl}`);
      } else if (error.name === 'EncodingError') {
        console.error(`🔊 Invalid audio format: ${sampleIdOrUrl}`, error);
      } else {
        console.error(`❌ Failed to load sample: ${sampleIdOrUrl}`, error);
      }
      return null;
    }
  }

  /**
   * Play a sample immediately - ONLY REAL SAMPLES with SECURE ID SUPPORT
   */
  playSample(sampleIdOrUrl: string, volume: number = 1.0, time?: number, trackId?: string): void {
    const audioBuffer = this.sampleCache.get(sampleIdOrUrl);
    
    if (!audioBuffer) {
      console.error(`❌ Sample not in cache: ${sampleIdOrUrl}`);
      return;
    }

    const playTime = time || this.audioContext.currentTime;
    
    // 🛡️ MOBILE: Check simultaneous sample limit
    if (this.isMobile && trackId) {
      const totalActive = Array.from(this.activeSources.values())
        .reduce((sum, sources) => sum + sources.length, 0);
      
      if (totalActive >= this.MAX_SIMULTANEOUS_SAMPLES) {
        console.warn(`⚠️ Mobile: Max ${this.MAX_SIMULTANEOUS_SAMPLES} samples reached`);
        this.stopOldestSource();
      }
    }
    
    // Create audio nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set volume
    gainNode.gain.setValueAtTime(volume, playTime);
    
    // 🛡️ Track active source
    if (trackId) {
      if (!this.activeSources.has(trackId)) {
        this.activeSources.set(trackId, []);
      }
      const sources = this.activeSources.get(trackId)!;
      sources.push(source);
      
      // Auto-cleanup when ended
      source.onended = () => {
        const idx = sources.indexOf(source);
        if (idx > -1) sources.splice(idx, 1);
      };
    }
    
    // Start playback
    source.start(playTime);
    
    const displayName = sampleIdOrUrl.includes('/') ? sampleIdOrUrl.split('/').pop() : sampleIdOrUrl;
    console.log(`🔊 Playing: ${displayName} at volume ${volume.toFixed(2)}`);
  }

  /**
   * 🚀 LAZY LOADING: Register sample path for later loading
   */
  registerSamplePath(trackId: string, samplePath: string): void {
    this.samplePaths.set(trackId, samplePath);
    console.log(`📝 Registered sample path: ${trackId} -> ${samplePath.split('/').pop()}`);
  }

  /**
   * 🚀 LAZY LOADING: Register sample path by sampleId (FIXED VERSION)
   */
  registerSamplePathById(sampleId: string, samplePath: string): void {
    this.samplePaths.set(sampleId, samplePath);
    console.log(`📝 Registered sample path by ID: ${sampleId} -> ${samplePath.split('/').pop()}`);
    
    // DEBUG: Show all registered samples
    console.log(`🔍 Total registered samples: ${this.samplePaths.size}`);
    const allKeys = Array.from(this.samplePaths.keys());
    console.log(`🗂️ All registered sampleIds:`, allKeys);
  }

  /**
   * 🚀 LAZY LOADING: Load sample on demand (when first needed)
   */
  async ensureSampleLoaded(trackId: string): Promise<boolean> {
    const samplePath = this.samplePaths.get(trackId);
    if (!samplePath) {
      console.warn(`⚠️ No sample path registered for track: ${trackId}`);
      return false;
    }

    // Already cached?
    if (this.sampleCache.has(samplePath)) {
      return true;
    }

    // Already loading?
    if (this.loadingPromises.has(samplePath)) {
      console.log(`⏳ Waiting for sample to load: ${trackId}`);
      const buffer = await this.loadingPromises.get(samplePath);
      return buffer !== null;
    }

    // Start loading
    console.log(`🚀 Lazy loading sample: ${trackId} -> ${samplePath.split('/').pop()}`);
    this.pendingLoads.add(trackId);
    
    const loadPromise = this.loadSample(samplePath);
    this.loadingPromises.set(samplePath, loadPromise);
    
    try {
      const buffer = await loadPromise;
      this.pendingLoads.delete(trackId);
      
      if (buffer) {
        console.log(`✅ Lazy load complete: ${trackId}`);
        return true;
      } else {
        console.error(`❌ Lazy load failed: ${trackId}`);
        return false;
      }
    } catch (error) {
      this.pendingLoads.delete(trackId);
      this.loadingPromises.delete(samplePath);
      console.error(`❌ Lazy load error for ${trackId}:`, error);
      return false;
    }
  }

  /**
   * 🚀 LAZY LOADING: Load sample by sampleId (FIXED VERSION)
   */
  async ensureSampleLoadedById(sampleId: string): Promise<boolean> {
    const samplePath = this.samplePaths.get(sampleId);
    if (!samplePath) {
      console.warn(`⚠️ No sample path registered for sampleId: ${sampleId}`);
      return false;
    }

    // Already cached?
    if (this.sampleCache.has(samplePath)) {
      return true;
    }

    // Already loading?
    if (this.loadingPromises.has(samplePath)) {
      console.log(`⏳ Waiting for sample to load: ${sampleId}`);
      const buffer = await this.loadingPromises.get(samplePath);
      return buffer !== null;
    }

    // Start loading
    console.log(`🚀 Lazy loading sample by ID: ${sampleId} -> ${samplePath.split('/').pop()}`);
    this.pendingLoads.add(sampleId);
    
    const loadPromise = this.loadSample(samplePath);
    this.loadingPromises.set(samplePath, loadPromise);
    
    try {
      const buffer = await loadPromise;
      this.pendingLoads.delete(sampleId);
      
      if (buffer) {
        console.log(`✅ Lazy load complete for sampleId: ${sampleId}`);
        return true;
      } else {
        console.error(`❌ Lazy load failed for sampleId: ${sampleId}`);
        return false;
      }
    } catch (error) {
      this.pendingLoads.delete(sampleId);
      this.loadingPromises.delete(samplePath);
      console.error(`❌ Lazy load error for sampleId ${sampleId}:`, error);
      return false;
    }
  }

  /**
   * 🚀 LAZY LOADING: Play sample with automatic loading - FIXED for sample selection
   */
  async playTrackSample(trackId: string, volume: number = 1.0, time?: number): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) {
      console.error(`❌ Track not found: ${trackId}`);
      return;
    }

    // Get the selected sample ID for this track
    const selectedSampleId = track.selectedSampleId;
    if (!selectedSampleId) {
      console.warn(`⚠️ No sample selected for track: ${trackId}`);
      return;
    }

    // CRITICAL FIX: Use sampleId instead of trackId for sample loading
    const loaded = await this.ensureSampleLoadedById(selectedSampleId);
    if (!loaded) {
      console.error(`❌ Could not load sample: ${selectedSampleId} for track: ${trackId}`);
      return;
    }

    // Get the sample path by sampleId and play it
    const samplePath = this.samplePaths.get(selectedSampleId);
    if (samplePath) {
      console.log(`🔊 Playing sample: ${selectedSampleId} for track: ${trackId}`);
      this.playSample(samplePath, volume, time, trackId); // Pass trackId for tracking
    } else {
      console.error(`❌ Sample path not found for sampleId: ${selectedSampleId}`);
    }
  }

  /**
   * 🚀 LAZY LOADING: Check if sample is currently loading
   */
  isTrackLoading(trackId: string): boolean {
    return this.pendingLoads.has(trackId);
  }

  /**
   * 🚀 LAZY LOADING: Get loading status for UI
   */
  getLoadingStatus(): { loading: string[], total: number } {
    return {
      loading: Array.from(this.pendingLoads),
      total: this.samplePaths.size
    };
  }

  /**
   * Update pattern for a track - LIVE EDITING
   */
  updatePattern(trackId: string, stepIndex: number, active: boolean): void {
    const track = this.tracks.get(trackId);
    if (track && stepIndex >= 0 && stepIndex < 16) {
      track.steps[stepIndex] = active;
      console.log(`🎵 Pattern updated: ${trackId} step ${stepIndex} = ${active}`);
    }
  }

  /**
   * Update track volume - LIVE MIXING
   */
  updateVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.volume = Math.max(0, Math.min(1, volume));
      console.log(`🔊 Volume updated: ${trackId} = ${track.volume.toFixed(2)}`);
    }
  }

  /**
   * Update selected sample for track
   */
  updateSelectedSample(trackId: string, sampleId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.selectedSampleId = sampleId;
      console.log(`🎼 Sample updated: ${trackId} = ${sampleId}`);
    }
  }

  /**
   * Get active tracks for a step
   */
  getActiveTracksForStep(stepIndex: number): string[] {
    const activeTracks: string[] = [];
    
    this.tracks.forEach((track, trackId) => {
      if (track.steps[stepIndex] && !track.muted) {
        activeTracks.push(trackId);
      }
    });
    
    return activeTracks;
  }

  /**
   * Get track data
   */
  getTrack(trackId: string): TrackPattern | undefined {
    return this.tracks.get(trackId);
  }

  /**
   * Professional scheduler - PRECISION TIMING with Infinite Loop Protection
   */
  private scheduler = (): void => {
    if (!this.isPlaying) {
      return;
    }

    const stepDuration = (60 / this.bpm) / 4; // 16th notes
    const currentTime = this.audioContext.currentTime;
    
    // Schedule events within lookahead window
    while (this.nextStepTime < currentTime + this.SCHEDULE_AHEAD_TIME) {
      // Schedule current step
      this.scheduleStep(this.currentStep, this.nextStepTime);
      
      // Advance to next step
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  };

  /**
   * Schedule samples for a step - WITH GROOVE TIMING SUPPORT
   */
  private scheduleStep(stepIndex: number, baseTime: number): void {
    const activeTracks = this.getActiveTracksForStep(stepIndex);
    
    // 🛡️ DOUBLE-TRIGGER PREVENTION - Move 'now' declaration to method scope
    const now = Date.now();
    
    // 🚀 LAZY LOADING: Play samples on-demand with groove-adjusted timing (SYNCHRONOUS)
    activeTracks.forEach((trackId) => {
      // 🛡️ DOUBLE-TRIGGER PREVENTION
      const eventKey = `${trackId}-${stepIndex}-${Math.floor(baseTime * 1000)}`;
      
      // Check if recently scheduled (within 50ms)
      if (this.scheduledEvents.has(eventKey)) {
        const lastTime = this.scheduledEvents.get(eventKey)!;
        if (now - lastTime < 50) {
          console.warn(`⚠️ Preventing double-trigger: ${trackId} step ${stepIndex}`);
          return;
        }
      }
      
      this.scheduledEvents.set(eventKey, now);
      
      const track = this.tracks.get(trackId);
      if (track) {
        // GROOVE INTEGRATION: Calculate timing offset for this step
        const grooveOffset = this.calculateGrooveOffset(track, stepIndex);
        const adjustedTime = baseTime + grooveOffset;
        
        // Debug groove timing (only when groove is applied)
        if (grooveOffset !== 0) {
          console.log(`🎵 Groove: track=${trackId}, step=${stepIndex}, offset=${(grooveOffset * 1000).toFixed(1)}ms`);
        }
        
        // SCHEDULER FIX: Use direct sample playback to avoid async blocking
        if (track.selectedSampleId) {
          const samplePath = this.samplePaths.get(track.selectedSampleId);
          if (samplePath && this.sampleCache.has(samplePath)) {
            // Sample is cached - play directly without async loading
            this.playSample(samplePath, track.volume, adjustedTime, trackId);
          }
        }
      }
    });
    
    // Cleanup old events (> 1 second old)
    const cutoff = now - 1000;
    for (const [key, time] of this.scheduledEvents) {
      if (time < cutoff) {
        this.scheduledEvents.delete(key);
      }
    }
  }

  /**
   * Calculate groove timing offset for a specific step
   * EXTENDED RANGE: Now supports ±75% for more extreme groove!
   */
  private calculateGrooveOffset(track: TrackPattern, stepIndex: number): number {
    // Return 0 if no groove data
    if (!track.groove || !track.groove[stepIndex]) {
      return 0;
    }
    
    const grooveDot = track.groove[stepIndex];
    
    // No offset for straight timing (0%)
    if (grooveDot.offsetPercent === 0) {
      return 0;
    }
    
    // Calculate step duration (16th note)
    const stepDuration = (60 / this.bpm) / 4; // seconds per 16th note
    
    // Convert percentage to timing offset
    // EXTENDED: -75% to +75% becomes -75% to +75% of step duration
    const offsetRatio = grooveDot.offsetPercent / 100; // -0.75 to +0.75
    const maxOffset = stepDuration * 0.75; // EXTENDED: Maximum ±75% of step duration
    
    const calculatedOffset = offsetRatio * maxOffset;
    
    // EXTENDED: Increased safety clamp to ±150ms for extreme groove
    const clampedOffset = Math.max(-0.15, Math.min(0.15, calculatedOffset));
    
    return clampedOffset;
  }

  /**
   * Callback for step events - set by external components
   * Now receives groove-adjusted timing
   */
  onStepCallback?: (trackId: string, sampleId: string, volume: number, time: number) => void;

  /**
   * Update groove data for a track - LIVE GROOVE EDITING
   */
  updateGroove(trackId: string, groove: GrooveDot[]): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.groove = [...groove]; // Deep copy groove array
      console.log(`🎵 Groove updated for track: ${trackId}`);
    }
  }

  /**
   * Update single groove dot - for real-time drag operations
   */
  updateGrooveDot(trackId: string, stepIndex: number, offsetPercent: number): void {
    const track = this.tracks.get(trackId);
    if (track && track.groove && track.groove[stepIndex]) {
      const stepDuration = (60 / this.bpm) / 4;
      const offsetMs = (offsetPercent / 100) * stepDuration * 0.75 * 1000; // EXTENDED: 75% of step duration
      
      track.groove[stepIndex] = {
        stepIndex,
        offsetPercent: Math.max(-75, Math.min(75, offsetPercent)), // EXTENDED to ±75%
        offsetMs
      };
      
      console.log(`🎵 Groove dot updated: track=${trackId}, step=${stepIndex}, offset=${offsetPercent.toFixed(1)}%`);
    }
  }

  /**
   * Start playback
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    console.log('▶️ Starting audio engine...');
    
    // CRITICAL FIX: Resume AudioContext to ensure currentTime advances
    if (this.audioContext.state === 'suspended') {
      console.log('🔧 Resuming suspended AudioContext...');
      await this.audioContext.resume();
    }
    
    // Validate AudioContext is working
    if (this.audioContext.currentTime === 0) {
      console.warn('⚠️ AudioContext.currentTime is still 0 - forcing minimal delay');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.audioContext.currentTime + 0.005; // Small initial delay
    
    console.log(`🕒 Initial timing: currentTime=${this.audioContext.currentTime.toFixed(3)}, nextStepTime=${this.nextStepTime.toFixed(3)}`);
    
    // Start precision scheduler
    this.schedulerInterval = setInterval(this.scheduler, this.LOOKAHEAD_TIME);
    
    console.log('✅ Audio engine started');
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (!this.isPlaying) return;
    
    console.log('⏹️ Stopping audio engine...');
    
    this.isPlaying = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    // 🛡️ Stop all active sources
    this.stopAllActiveSources();
    
    // Clear scheduled events
    this.scheduledEvents.clear();
    
    this.nextStepTime = 0;
    this.currentStep = 0;
    
    console.log('✅ Audio engine stopped');
  }
  
  /**
   * Stop all active audio sources
   */
  private stopAllActiveSources(): void {
    let count = 0;
    for (const [_, sources] of this.activeSources) {
      sources.forEach(source => {
        try {
          source.stop();
          count++;
        } catch (e) {
          // Already ended
        }
      });
      sources.length = 0;
    }
    if (count > 0) {
      console.log(`🛑 Stopped ${count} active sources`);
    }
  }
  
  /**
   * Stop oldest source (mobile optimization)
   */
  private stopOldestSource(): void {
    for (const [trackId, sources] of this.activeSources) {
      if (sources.length > 0) {
        const oldest = sources.shift();
        if (oldest) {
          try {
            oldest.stop();
            console.log(`🛑 Stopped oldest: ${trackId}`);
            return;
          } catch (e) {
            // Already ended
          }
        }
      }
    }
  }

  /**
   * Update BPM
   */
  setBpm(newBpm: number): void {
    this.bpm = Math.max(60, Math.min(200, newBpm));
    console.log(`🎵 BPM updated: ${this.bpm}`);
  }

  /**
   * Get current state
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  isEnginePlaying(): boolean {
    return this.isPlaying;
  }

  getBpm(): number {
    return this.bpm;
  }

  setBPM(newBpm: number): void {
    if (newBpm < 60 || newBpm > 200) {
      console.warn(`⚠️ BPM ${newBpm} out of range, clamping to 60-200`);
      newBpm = Math.max(60, Math.min(200, newBpm));
    }
    
    const oldBpm = this.bpm;
    this.bpm = newBpm;
    
    console.log(`🎵 BPM changed: ${oldBpm} → ${newBpm}`);
    
    // If playing, the scheduler will automatically use the new BPM for the next step
    // No need to restart - professional drum machines work this way
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { samples: number, memoryUsage: string } {
    let totalSize = 0;
    this.sampleCache.forEach(buffer => {
      totalSize += buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32
    });
    
    return {
      samples: this.sampleCache.size,
      memoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Get groove statistics for debugging
   */
  getGrooveStats(): { tracks: number, grooveDots: number, activeOffsets: number } {
    let grooveDots = 0;
    let activeOffsets = 0;
    
    this.tracks.forEach(track => {
      if (track.groove) {
        grooveDots += track.groove.length;
        activeOffsets += track.groove.filter(dot => dot.offsetPercent !== 0).length;
      }
    });
    
    return {
      tracks: this.tracks.size,
      grooveDots,
      activeOffsets
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.sampleCache.clear();
    this.tracks.clear();
    
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    console.log('🧹 Audio engine disposed');
  }
}