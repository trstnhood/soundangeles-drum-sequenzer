/**
 * Sample Degradation System - 10-bit Audio Protection
 * Reduces sample quality for preview while maintaining musical usability
 * NO Rate Limiting - Users must have full creative freedom!
 */

export interface DegradationConfig {
  bitDepth: number;      // Target bit depth (10-bit default)
  lowpassHz?: number;    // Optional lowpass filter (12kHz default)
  enabled: boolean;      // Enable/disable degradation
  packId?: string;       // Specific pack to degrade (for testing)
}

export class SampleDegradation {
  private audioContext: AudioContext;
  private config: DegradationConfig;

  constructor(audioContext: AudioContext, config: DegradationConfig = {
    bitDepth: 10,
    lowpassHz: 12000,
    enabled: true,
    packId: 'ill-will-drumsound-pack-vol-1' // Test with Vol.1 only
  }) {
    this.audioContext = audioContext;
    this.config = config;
  }

  /**
   * Apply degradation to audio buffer for preview protection
   * ONLY applied to specified pack for testing
   */
  async degradeAudioBuffer(
    originalBuffer: AudioBuffer, 
    sampleUrl: string
  ): Promise<AudioBuffer> {
    
    // Check if this sample should be degraded
    if (!this.shouldDegradeSample(sampleUrl)) {
      console.log(`🔓 Original quality: ${this.extractSampleName(sampleUrl)}`);
      return originalBuffer;
    }

    console.log(`🔒 Applying 10-bit degradation: ${this.extractSampleName(sampleUrl)}`);

    // Create new degraded buffer
    const degradedBuffer = this.audioContext.createBuffer(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate
    );

    // Process each channel
    for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
      const originalData = originalBuffer.getChannelData(channel);
      const degradedData = degradedBuffer.getChannelData(channel);
      
      // Apply bit-depth reduction + optional lowpass
      this.applyBitDepthReduction(originalData, degradedData, this.config.bitDepth);
      
      if (this.config.lowpassHz) {
        this.applySimpleLowpass(degradedData, this.config.lowpassHz);
      }
    }

    return degradedBuffer;
  }

  /**
   * Check if sample should be degraded based on pack
   */
  private shouldDegradeSample(sampleUrl: string): boolean {
    if (!this.config.enabled) return false;
    
    // Only degrade Vol.1 for testing
    if (this.config.packId) {
      return sampleUrl.includes('Vol. 1') || sampleUrl.includes('Vol-1');
    }
    
    return true; // Degrade all if no specific pack
  }

  /**
   * Reduce bit depth to target (10-bit default)
   * Creates audible quality reduction while maintaining musical character
   */
  private applyBitDepthReduction(
    inputData: Float32Array, 
    outputData: Float32Array, 
    targetBits: number
  ): void {
    const levels = Math.pow(2, targetBits) - 1;
    const quantizationStep = 2.0 / levels;

    for (let i = 0; i < inputData.length; i++) {
      // Quantize to target bit depth
      const quantized = Math.round((inputData[i] + 1.0) / quantizationStep) * quantizationStep - 1.0;
      
      // Clamp to valid range
      outputData[i] = Math.max(-1.0, Math.min(1.0, quantized));
    }
  }

  /**
   * Simple lowpass filter implementation
   * Removes high-frequency content above cutoff
   */
  private applySimpleLowpass(data: Float32Array, cutoffHz: number): void {
    const sampleRate = this.audioContext.sampleRate;
    const rc = 1.0 / (2.0 * Math.PI * cutoffHz);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);

    let previousOutput = data[0];
    
    for (let i = 1; i < data.length; i++) {
      previousOutput = previousOutput + alpha * (data[i] - previousOutput);
      data[i] = previousOutput;
    }
  }

  /**
   * Extract readable sample name from URL for logging
   */
  private extractSampleName(url: string): string {
    return url.split('/').pop()?.replace(/\.(wav|mp3)$/i, '') || 'Unknown Sample';
  }

  /**
   * Update degradation config
   */
  updateConfig(newConfig: Partial<DegradationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔧 Degradation config updated:`, this.config);
  }

  /**
   * Get current config
   */
  getConfig(): DegradationConfig {
    return { ...this.config };
  }

  /**
   * Get sample quality stats
   */
  getQualityStats(buffer: AudioBuffer): {
    bitDepth: string;
    sampleRate: number;
    duration: number;
    channels: number;
  } {
    // Estimate bit depth by analyzing dynamic range
    let maxAbsValue = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < channelData.length; i++) {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(channelData[i]));
      }
    }

    // Rough bit depth estimation
    const estimatedBits = maxAbsValue > 0.9 ? '16+' : 
                         maxAbsValue > 0.5 ? '12-14' : '8-10';

    return {
      bitDepth: estimatedBits + ' bit (estimated)',
      sampleRate: buffer.sampleRate,
      duration: parseFloat((buffer.duration * 1000).toFixed(1)),
      channels: buffer.numberOfChannels
    };
  }
}