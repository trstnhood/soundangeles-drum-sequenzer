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
  
  // Professional timing constants
  private readonly LOOKAHEAD_TIME = 25.0; // Check every 25ms
  private readonly SCHEDULE_AHEAD_TIME = 0.1; // Schedule 100ms ahead
  
  constructor() {
    this.audioContext = new AudioContext({
      latencyHint: 'interactive',
      sampleRate: 44100
    });
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
  playSample(sampleIdOrUrl: string, volume: number = 1.0, time?: number): void {
    const audioBuffer = this.sampleCache.get(sampleIdOrUrl);
    
    if (!audioBuffer) {
      console.error(`❌ Sample not in cache: ${sampleIdOrUrl}`);
      return;
    }

    const playTime = time || this.audioContext.currentTime;
    
    // Create audio nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set volume
    gainNode.gain.setValueAtTime(volume, playTime);
    
    // Start playback
    source.start(playTime);
    
    const displayName = sampleIdOrUrl.includes('/') ? sampleIdOrUrl.split('/').pop() : sampleIdOrUrl;
    console.log(`🔊 Playing: ${displayName} at volume ${volume.toFixed(2)}`);
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
      console.log('🚫 Scheduler called but not playing');
      return;
    }

    const stepDuration = (60 / this.bpm) / 4; // 16th notes
    const currentTime = this.audioContext.currentTime;
    
    console.log(`⏰ Scheduler: step=${this.currentStep}, nextTime=${this.nextStepTime.toFixed(3)}, currentTime=${currentTime.toFixed(3)}`);
    
    // CRITICAL SAFEGUARD: Prevent infinite loops
    let maxIterations = 4; // Max 4 steps per scheduler call
    let iterations = 0;
    
    // Schedule events within lookahead window
    while (this.nextStepTime < currentTime + this.SCHEDULE_AHEAD_TIME && iterations < maxIterations) {
      console.log(`📅 Scheduling step ${this.currentStep} at time ${this.nextStepTime.toFixed(3)} (iteration ${iterations + 1})`);
      this.scheduleStep(this.currentStep, this.nextStepTime);
      
      // Advance to next step
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 16;
      iterations++;
      
      console.log(`➡️ Advanced to step ${this.currentStep}`);
    }
    
    // Warn if we hit the iteration limit
    if (iterations >= maxIterations) {
      console.warn(`⚠️ Scheduler hit max iterations (${maxIterations}) - preventing infinite loop`);
    }
  };

  /**
   * Schedule samples for a step - WITH GROOVE TIMING SUPPORT
   */
  private scheduleStep(stepIndex: number, baseTime: number): void {
    const activeTracks = this.getActiveTracksForStep(stepIndex);
    
    // Trigger callback for each active track with groove-adjusted timing
    activeTracks.forEach(trackId => {
      const track = this.tracks.get(trackId);
      if (track && this.onStepCallback) {
        // GROOVE INTEGRATION: Calculate timing offset for this step
        const grooveOffset = this.calculateGrooveOffset(track, stepIndex);
        const adjustedTime = baseTime + grooveOffset;
        
        // Debug groove timing (only when groove is applied)
        if (grooveOffset !== 0) {
          console.log(`🎵 Groove: track=${trackId}, step=${stepIndex}, offset=${(grooveOffset * 1000).toFixed(1)}ms`);
        }
        
        this.onStepCallback(trackId, track.selectedSampleId, track.volume, adjustedTime);
      }
    });
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
    
    this.nextStepTime = 0;
    this.currentStep = 0;
    
    console.log('✅ Audio engine stopped');
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