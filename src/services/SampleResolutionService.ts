/**
 * Pack-Agnostic Sample Resolution Service
 * Replaces hardcoded SAMPLE_KITS with dynamic API-based resolution
 */

export interface DrumSample {
  id: string;
  name: string;
  audioFile?: string;
  sampleType: 'audio' | 'synthesized';
  freq?: number;
  type?: OscillatorType;
  duration?: number;
}

export interface PackStructure {
  id: string;
  name: string;
  tracks: {
    [trackId: string]: {
      name: string;
      displayName: string;
      samples: DrumSample[];
    };
  };
}

export class SampleResolutionService {
  private cache: Map<string, PackStructure> = new Map();
  private loadingPromises: Map<string, Promise<PackStructure>> = new Map();

  /**
   * Discover complete pack structure using dynamic APIs
   */
  async discoverPackStructure(packId: string): Promise<PackStructure> {
    // Return cached if available
    if (this.cache.has(packId)) {
      return this.cache.get(packId)!;
    }

    // Return existing promise if loading
    if (this.loadingPromises.has(packId)) {
      return this.loadingPromises.get(packId)!;
    }

    // Create new loading promise
    const loadingPromise = this._loadPackStructure(packId);
    this.loadingPromises.set(packId, loadingPromise);

    try {
      const structure = await loadingPromise;
      this.cache.set(packId, structure);
      return structure;
    } finally {
      this.loadingPromises.delete(packId);
    }
  }

  private async _loadPackStructure(packId: string): Promise<PackStructure> {
    console.log(`🔍 Loading pack structure for: ${packId}`);

    // 1. Get pack metadata
    const packsResponse = await fetch('/api/discover-packs');
    const { packs } = await packsResponse.json();
    const pack = packs.find((p: any) => p.id === packId);

    if (!pack) {
      throw new Error(`Pack ${packId} not found`);
    }

    console.log(`📦 Found pack: ${pack.name}`);

    // 2. Get instrument folders  
    const instrumentsResponse = await fetch(
      `/api/discover-instruments?pack=${encodeURIComponent(pack.folderName)}`
    );
    const { folders } = await instrumentsResponse.json();

    console.log(`🎵 Found ${folders.length} instrument folders`);

    const structure: PackStructure = {
      id: packId,
      name: pack.name,
      tracks: {}
    };

    // 3. Load samples for each folder
    for (const folder of folders) {
      const trackId = this.getTrackIdFromFolder(folder);
      const displayName = this.getDisplayNameFromFolder(folder);

      console.log(`📂 Loading samples for: ${folder} -> ${trackId}`);

      try {
        const samplesResponse = await fetch(
          `/api/discover-samples?pack=${encodeURIComponent(pack.folderName)}&folder=${encodeURIComponent(folder)}`
        );
        const { samples: fileNames } = await samplesResponse.json();

        console.log(`🎼 Found ${fileNames.length} samples in ${folder}`);

        structure.tracks[trackId] = {
          name: folder,
          displayName: displayName,
          samples: fileNames.map((fileName: string, index: number) => ({
            id: `${trackId}_${index + 1}_${Date.now()}`,
            name: fileName.replace(/\.(wav|mp3)$/i, ''),
            audioFile: `/sample-packs/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`,
            sampleType: 'audio' as const
          }))
        };
      } catch (error) {
        console.error(`❌ Failed to load samples for ${folder}:`, error);
        
        // Create fallback synthesized sample
        structure.tracks[trackId] = {
          name: folder,
          displayName: displayName,
          samples: [] // No fallback samples - only real audio files
        };
      }
    }

    console.log(`✅ Pack structure loaded: ${Object.keys(structure.tracks).length} tracks`);
    return structure;
  }

  /**
   * Get all samples for a specific track
   */
  async getSamplesForTrack(packId: string, trackId: string): Promise<DrumSample[]> {
    const structure = await this.discoverPackStructure(packId);
    return structure.tracks[trackId]?.samples || [];
  }

  /**
   * Resolve specific sample by ID
   */
  async resolveSampleForTrack(packId: string, trackId: string, sampleId: string): Promise<DrumSample | null> {
    const samples = await this.getSamplesForTrack(packId, trackId);
    return samples.find(s => s.id === sampleId) || samples[0] || null;
  }

  /**
   * Get all available track IDs for a pack
   */
  async getAvailableTracks(packId: string): Promise<string[]> {
    const structure = await this.discoverPackStructure(packId);
    return Object.keys(structure.tracks);
  }

  /**
   * Get track metadata
   */
  async getTrackMetadata(packId: string, trackId: string): Promise<{name: string, displayName: string} | null> {
    const structure = await this.discoverPackStructure(packId);
    const track = structure.tracks[trackId];
    return track ? { name: track.name, displayName: track.displayName } : null;
  }

  /**
   * Convert folder name to track ID (consistent with existing logic)
   */
  private getTrackIdFromFolder(folderName: string): string {
    return folderName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Convert folder name to display name
   */
  private getDisplayNameFromFolder(folderName: string): string {
    // Remove numeric prefixes and clean up
    return folderName
      .replace(/^\d+[-\s]*/, '')  // Remove "01-", "02-", etc.
      .replace(/[-_]/g, ' ')       // Replace dashes/underscores with spaces
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get fallback frequency for synthesized sounds
   */
  private getFallbackFrequency(folderName: string): number {
    const folderType = folderName.toLowerCase();
    
    if (folderType.includes('kick') || folderType.includes('bass')) {
      return 60;
    } else if (folderType.includes('snare')) {
      return 200;
    } else if (folderType.includes('rimshot')) {
      return 300;
    } else if (folderType.includes('hi-hat') && folderType.includes('open')) {
      return 6000;
    } else if (folderType.includes('hi-hat') || folderType.includes('hh')) {
      return 8000;
    } else if (folderType.includes('ride') || folderType.includes('crash')) {
      return 4000;
    } else if (folderType.includes('clap') || folderType.includes('hand')) {
      return 1000;
    } else if (folderType.includes('percussion') || folderType.includes('perc')) {
      return 500;
    } else if (folderType.includes('tom')) {
      return 120;
    } else if (folderType.includes('fingersnap') || folderType.includes('snap')) {
      return 2000;
    }
    
    return 440; // Default fallback
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    console.log('🧹 Sample resolution cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cached: number, loading: number } {
    return {
      cached: this.cache.size,
      loading: this.loadingPromises.size
    };
  }
}

// Singleton instance for global use
export const sampleResolutionService = new SampleResolutionService();