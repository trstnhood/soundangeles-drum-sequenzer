/**
 * Professional Sample Manager - Dynamic Sample Pack Discovery
 * BULLETPROOF LOADING - NO SYNTHESIS FALLBACKS
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

export class SampleManager {
  private packCache: Map<string, PackStructure> = new Map();
  private availablePacks: SamplePack[] = [];
  private loadingPromises: Map<string, Promise<PackStructure>> = new Map();

  /**
   * Discover all available sample packs
   */
  async discoverPacks(): Promise<SamplePack[]> {
    console.log('🔍 Discovering sample packs...');
    
    try {
      const response = await fetch('/api/discover-packs');
      if (!response.ok) {
        throw new Error(`Pack discovery failed: ${response.status}`);
      }
      
      const data = await response.json();
      this.availablePacks = data.packs || [];
      
      console.log(`📦 Found ${this.availablePacks.length} sample packs:`, 
        this.availablePacks.map(p => p.name));
      
      return this.availablePacks;
    } catch (error) {
      console.error('❌ Pack discovery failed:', error);
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
    console.log(`🚀 Loading pack structure: ${packId}`);

    // Find pack metadata
    const pack = this.availablePacks.find(p => p.id === packId);
    if (!pack) {
      console.error(`❌ Pack not found: ${packId}`);
      return null;
    }

    try {
      // Discover instruments
      const instrumentsResponse = await fetch(
        `/api/discover-instruments?pack=${encodeURIComponent(pack.folderName)}`
      );
      
      if (!instrumentsResponse.ok) {
        throw new Error(`Instruments discovery failed: ${instrumentsResponse.status}`);
      }
      
      const instrumentsData = await instrumentsResponse.json();
      const instrumentFolders = instrumentsData.folders || [];
      
      console.log(`🎼 Found ${instrumentFolders.length} instrument folders in ${pack.name}`);

      // Load samples for each instrument
      const packStructure: PackStructure = {
        id: packId,
        name: pack.name,
        tracks: new Map()
      };

      for (const folderName of instrumentFolders) {
        const trackId = this.folderNameToTrackId(folderName);
        const displayName = this.folderNameToDisplayName(folderName);
        
        console.log(`📂 Loading samples for: ${folderName} -> ${trackId}`);

        try {
          const samples = await this.loadInstrumentSamples(pack.folderName, folderName);
          
          if (samples.length > 0) {
            packStructure.tracks.set(trackId, {
              id: trackId,
              name: folderName,
              displayName: displayName,
              samples: samples
            });
            
            console.log(`✅ Loaded ${samples.length} samples for ${trackId}`);
          } else {
            console.warn(`⚠️ No samples found for ${folderName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to load samples for ${folderName}:`, error);
        }
      }

      console.log(`🎯 Pack structure loaded: ${packStructure.tracks.size} tracks`);
      return packStructure;

    } catch (error) {
      console.error(`❌ Failed to load pack structure for ${packId}:`, error);
      return null;
    }
  }

  /**
   * Load samples for a specific instrument folder - 🔒 WITH SECURE ID SUPPORT
   */
  private async loadInstrumentSamples(packFolderName: string, instrumentFolder: string): Promise<SampleInfo[]> {
    try {
      const response = await fetch(
        `/api/discover-samples?pack=${encodeURIComponent(packFolderName)}&folder=${encodeURIComponent(instrumentFolder)}`
      );
      
      if (!response.ok) {
        throw new Error(`Samples discovery failed: ${response.status}`);
      }
      
      const data = await response.json();
      const sampleFiles = data.samples || [];  // Legacy support
      const secureSamples = data.secureSamples || [];  // 🔒 NEW: Secure ID format
      
      // 🔒 USE SECURE IDs if available, otherwise fallback to legacy format
      if (secureSamples.length > 0) {
        console.log(`🔒 Using secure sample IDs for ${instrumentFolder} (${secureSamples.length} samples)`);
        
        const samples: SampleInfo[] = secureSamples.map((secureItem: any, index: number) => {
          const sampleId = `${this.folderNameToTrackId(instrumentFolder)}_${index + 1}`;
          
          return {
            id: sampleId,
            name: secureItem.fileName.replace(/\.(wav|mp3)$/i, ''),
            audioFile: secureItem.secureId  // 🔒 USE SECURE ID instead of real path!
          };
        });

        return samples;
      } else {
        // Legacy fallback for compatibility
        console.log(`⚠️ Using legacy URLs for ${instrumentFolder} (secure samples not available)`);
        
        const samples: SampleInfo[] = sampleFiles.map((fileName: string, index: number) => {
          const sampleId = `${this.folderNameToTrackId(instrumentFolder)}_${index + 1}`;
          // GM7.1 MP3 Development Version - Use MP3 samples
          const mp3FileName = fileName.replace(/\.wav$/i, '.mp3');
          const audioFile = `/sample-packs-mp3/${encodeURIComponent(packFolderName)}/${encodeURIComponent(instrumentFolder)}/${encodeURIComponent(mp3FileName)}`;
          
          return {
            id: sampleId,
            name: fileName.replace(/\.(wav|mp3)$/i, ''),
            audioFile: audioFile
          };
        });

        return samples;
      }
    } catch (error) {
      console.error(`❌ Failed to load samples for ${instrumentFolder}:`, error);
      return [];
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
   * Convert folder name to track ID - FIXED: Use dashes instead of underscores
   */
  private folderNameToTrackId(folderName: string): string {
    return folderName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')  // Allow dashes
      .replace(/\s+/g, '-')          // Replace spaces with dashes
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing dashes
  }

  /**
   * Convert folder name to display name
   */
  private folderNameToDisplayName(folderName: string): string {
    return folderName
      .replace(/^\d+[-\s]*/, '')  // Remove numeric prefixes
      .replace(/[-_]/g, ' ')      // Replace dashes/underscores with spaces
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

    // Sort tracks by original folder order (numeric prefixes)
    trackPatterns.sort((a, b) => {
      const aStructure = packStructure.tracks.get(a.id);
      const bStructure = packStructure.tracks.get(b.id);
      
      if (aStructure && bStructure) {
        const aMatch = aStructure.name.match(/^(\d+)/);
        const bMatch = bStructure.name.match(/^(\d+)/);
        
        if (aMatch && bMatch) {
          return parseInt(aMatch[1]) - parseInt(bMatch[1]);
        }
      }
      
      return a.name.localeCompare(b.name);
    });

    return trackPatterns;
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
    console.log('🧹 Sample manager cache cleared');
  }
}