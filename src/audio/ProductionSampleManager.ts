/**
 * Production Sample Manager - Static JSON Data for Vercel Deployment
 * Bypasses Vite Directory Plugin for production compatibility
 */

export interface SamplePack {
  id: string;
  name: string;
  description: string;
  folderName: string;
  coverImage: string;
}

export interface InstrumentTrack {
  id: string;
  name: string;
  displayName: string;
  samples: SampleInfo[];
}

export interface SampleInfo {
  id: string;
  name: string;
  audioFile: string;
}

export interface PackStructure {
  id: string;
  name: string;
  tracks: Map<string, InstrumentTrack>;
}

interface StaticPackData {
  packs: Array<{
    id: string;
    name: string;
    description: string;
    folderName: string;
    coverImage: string;
    instruments: Array<{
      id: string;
      name: string;
      displayName: string;
      samples: string[];
    }>;
  }>;
}

export class ProductionSampleManager {
  private packCache: Map<string, PackStructure> = new Map();
  private availablePacks: SamplePack[] = [];
  private loadingPromises: Map<string, Promise<PackStructure>> = new Map();
  private staticData: StaticPackData | null = null;

  /**
   * Discover all available sample packs from static data
   */
  async discoverPacks(): Promise<SamplePack[]> {
    console.log('🔍 Discovering sample packs from static data...');
    
    try {
      // Load static data if not already loaded
      if (!this.staticData) {
        const response = await fetch('/sample-packs-data.json');
        if (!response.ok) {
          throw new Error(`Failed to load static pack data: ${response.status}`);
        }
        this.staticData = await response.json();
      }

      // Convert static data to pack list
      this.availablePacks = this.staticData.packs.map(pack => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        folderName: pack.folderName,
        coverImage: pack.coverImage
      }));
      
      console.log(`📦 Found ${this.availablePacks.length} sample packs from static data:`, 
        this.availablePacks.map(p => p.name));
      
      return this.availablePacks;
    } catch (error) {
      console.error('❌ Static pack discovery failed:', error);
      return [];
    }
  }

  /**
   * Load complete pack structure with all samples
   */
  async loadPackStructure(packId: string): Promise<PackStructure | null> {
    // Return cached if available
    if (this.packCache.has(packId)) {
      console.log(`📋 Using cached pack structure: ${packId}`);
      return this.packCache.get(packId)!;
    }

    // Return existing promise if loading
    if (this.loadingPromises.has(packId)) {
      console.log(`⏳ Pack already loading: ${packId}`);
      return this.loadingPromises.get(packId)!;
    }

    // Start new loading process
    const loadingPromise = this._loadPackStructureInternal(packId);
    this.loadingPromises.set(packId, loadingPromise);

    try {
      const structure = await loadingPromise;
      if (structure) {
        this.packCache.set(packId, structure);
      }
      return structure;
    } finally {
      this.loadingPromises.delete(packId);
    }
  }

  /**
   * Internal pack loading implementation
   */
  private async _loadPackStructureInternal(packId: string): Promise<PackStructure | null> {
    console.log(`🚀 Loading pack structure from static data: ${packId}`);

    try {
      // Ensure static data is loaded
      if (!this.staticData) {
        await this.discoverPacks();
      }

      // Find pack in static data
      const packData = this.staticData?.packs.find(p => p.id === packId);
      if (!packData) {
        console.error(`❌ Pack not found in static data: ${packId}`);
        return null;
      }

      console.log(`🎼 Found ${packData.instruments.length} instruments in ${packData.name}`);

      // Build pack structure
      const packStructure: PackStructure = {
        id: packId,
        name: packData.name,
        tracks: new Map()
      };

      // Process each instrument
      for (const instrumentData of packData.instruments) {
        console.log(`📂 Processing instrument: ${instrumentData.displayName} (${instrumentData.samples.length} samples)`);

        // Create sample info array
        const samples: SampleInfo[] = instrumentData.samples.map((sampleFileName, index) => {
          const sampleId = `${instrumentData.id}_${index + 1}`;
          const audioFile = `/sample-packs-mp3/${encodeURIComponent(packData.folderName)}/${encodeURIComponent(instrumentData.name)}/${encodeURIComponent(sampleFileName)}`;
          
          return {
            id: sampleId,
            name: sampleFileName.replace(/\.(wav|mp3)$/i, ''),
            audioFile: audioFile
          };
        });

        // Add instrument track to structure
        packStructure.tracks.set(instrumentData.id, {
          id: instrumentData.id,
          name: instrumentData.name,
          displayName: instrumentData.displayName,
          samples: samples
        });

        console.log(`✅ Processed ${samples.length} samples for ${instrumentData.displayName}`);
      }

      console.log(`🎯 Pack structure loaded: ${packStructure.tracks.size} tracks`);
      return packStructure;

    } catch (error) {
      console.error(`❌ Failed to load pack structure for ${packId}:`, error);
      return null;
    }
  }

  /**
   * Get samples for a specific track in a pack
   */
  async getTrackSamples(packId: string, trackId: string): Promise<SampleInfo[]> {
    const packStructure = await this.loadPackStructure(packId);
    if (!packStructure) {
      return [];
    }

    const track = packStructure.tracks.get(trackId);
    return track ? track.samples : [];
  }

  /**
   * Find a specific sample by ID in a pack
   */
  async findSample(packId: string, trackId: string, sampleId: string): Promise<SampleInfo | null> {
    const samples = await this.getTrackSamples(packId, trackId);
    return samples.find(s => s.id === sampleId) || samples[0] || null;
  }

  /**
   * Get default sample for a track (first sample)
   */
  async getDefaultSample(packId: string, trackId: string): Promise<SampleInfo | null> {
    const samples = await this.getTrackSamples(packId, trackId);
    return samples[0] || null;
  }

  /**
   * Get all available packs
   */
  getAvailablePacks(): SamplePack[] {
    return [...this.availablePacks];
  }

  /**
   * Get pack info by ID
   */
  getPackInfo(packId: string): SamplePack | null {
    return this.availablePacks.find(p => p.id === packId) || null;
  }

  /**
   * Create track patterns for a pack
   */
  async createTrackPatterns(packId: string): Promise<any[]> {
    const packStructure = await this.loadPackStructure(packId);
    if (!packStructure) {
      return [];
    }

    const trackPatterns: any[] = [];
    let colorIndex = 0;
    const colors = [
      'neon-red', 'neon-blue', 'neon-green', 'neon-yellow',
      'neon-purple', 'neon-cyan', 'neon-pink', 'neon-orange',
      'neon-lime', 'neon-indigo'
    ];

    packStructure.tracks.forEach((track, trackId) => {
      const defaultSample = track.samples[0];
      
      if (defaultSample) {
        trackPatterns.push({
          id: trackId,
          name: track.displayName,
          color: colors[colorIndex % colors.length],
          steps: new Array(16).fill(false),
          volume: 0.7,
          selectedSampleId: defaultSample.id,
          muted: false
        });
        
        colorIndex++;
      }
    });

    // Sort tracks by display name for consistent order
    trackPatterns.sort((a, b) => a.name.localeCompare(b.name));

    return trackPatterns;
  }

  /**
   * Validate sample file accessibility
   */
  async validateSample(sampleUrl: string): Promise<boolean> {
    try {
      const response = await fetch(sampleUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`❌ Sample validation failed: ${sampleUrl}`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { packs: number, loadingPacks: number } {
    return {
      packs: this.packCache.size,
      loadingPacks: this.loadingPromises.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.packCache.clear();
    this.loadingPromises.clear();
    this.staticData = null;
    console.log('🧹 Production sample manager cache cleared');
  }
}