/**
 * Smart Sample Manager - Automatically chooses between API and Static data
 * Handles both development (Vite plugin) and production (static JSON) environments
 */

import { SampleManager } from './SampleManager';
import { ProductionSampleManager } from './ProductionSampleManager';
import type { SamplePack, SampleInfo, PackStructure, InstrumentTrack } from './SampleManager';

export { type SamplePack, type SampleInfo, type PackStructure, type InstrumentTrack };

export class SmartSampleManager {
  private apiManager: SampleManager;
  private staticManager: ProductionSampleManager;
  private activeManager: SampleManager | ProductionSampleManager | null = null;
  private isInitialized = false;

  constructor() {
    this.apiManager = new SampleManager();
    this.staticManager = new ProductionSampleManager();
  }

  /**
   * Initialize by testing which data source is available
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔄 SmartSampleManager: Detecting best data source...');

    try {
      // First try static JSON data (production compatible)
      const staticData = await this.staticManager.discoverPacks();
      if (staticData.length > 0) {
        console.log('✅ Using ProductionSampleManager (static JSON data)');
        this.activeManager = this.staticManager;
        this.isInitialized = true;
        return;
      }
    } catch (error) {
      console.log('⚠️ Static data not available, trying API...');
    }

    try {
      // Fallback to API (development mode)
      const apiData = await this.apiManager.discoverPacks();
      if (apiData.length > 0) {
        console.log('✅ Using SampleManager (Vite plugin API)');
        this.activeManager = this.apiManager;
        this.isInitialized = true;
        return;
      }
    } catch (error) {
      console.log('❌ API also failed:', error);
    }

    throw new Error('No sample data source available (neither static nor API)');
  }

  /**
   * Discover all available sample packs
   */
  async discoverPacks(): Promise<SamplePack[]> {
    await this.initialize();
    if (!this.activeManager) {
      throw new Error('No active sample manager available');
    }
    return this.activeManager.discoverPacks();
  }

  /**
   * Load complete pack structure with all samples
   */
  async loadPackStructure(packId: string): Promise<PackStructure | null> {
    await this.initialize();
    if (!this.activeManager) {
      throw new Error('No active sample manager available');
    }
    return this.activeManager.loadPackStructure(packId);
  }

  /**
   * Get samples for a specific track in a pack
   */
  async getTrackSamples(packId: string, trackId: string): Promise<SampleInfo[]> {
    await this.initialize();
    if (!this.activeManager) {
      return [];
    }
    return this.activeManager.getTrackSamples(packId, trackId);
  }

  /**
   * Find a specific sample by ID in a pack
   */
  async findSample(packId: string, trackId: string, sampleId: string): Promise<SampleInfo | null> {
    await this.initialize();
    if (!this.activeManager) {
      return null;
    }
    return this.activeManager.findSample(packId, trackId, sampleId);
  }

  /**
   * Get default sample for a track (first sample)
   */
  async getDefaultSample(packId: string, trackId: string): Promise<SampleInfo | null> {
    await this.initialize();
    if (!this.activeManager) {
      return null;
    }
    return this.activeManager.getDefaultSample(packId, trackId);
  }

  /**
   * Get all available packs
   */
  getAvailablePacks(): SamplePack[] {
    if (!this.activeManager) {
      return [];
    }
    return this.activeManager.getAvailablePacks();
  }

  /**
   * Get pack info by ID
   */
  getPackInfo(packId: string): SamplePack | null {
    if (!this.activeManager) {
      return null;
    }
    return this.activeManager.getPackInfo(packId);
  }

  /**
   * Create track patterns for a pack
   */
  async createTrackPatterns(packId: string): Promise<any[]> {
    await this.initialize();
    if (!this.activeManager) {
      return [];
    }
    return this.activeManager.createTrackPatterns(packId);
  }

  /**
   * Validate sample file accessibility
   */
  async validateSample(sampleUrl: string): Promise<boolean> {
    if (!this.activeManager) {
      return false;
    }
    return this.activeManager.validateSample(sampleUrl);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { packs: number, loadingPacks: number } {
    if (!this.activeManager) {
      return { packs: 0, loadingPacks: 0 };
    }
    return this.activeManager.getCacheStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    if (this.activeManager) {
      this.activeManager.clearCache();
    }
    this.apiManager.clearCache();
    this.staticManager.clearCache();
    this.activeManager = null;
    this.isInitialized = false;
    console.log('🧹 SmartSampleManager cache cleared');
  }

  /**
   * Get the active manager type for debugging
   */
  getActiveManagerType(): string {
    if (!this.isInitialized) return 'uninitialized';
    if (this.activeManager === this.staticManager) return 'static';
    if (this.activeManager === this.apiManager) return 'api';
    return 'none';
  }
}