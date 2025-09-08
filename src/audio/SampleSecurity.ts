/**
 * Sample Security System - URL Obfuscation
 * Hides real sample paths from DevTools inspection
 * Provides secure sample ID mapping for protected access
 */

export interface SecureSampleMapping {
  secureId: string;       // e.g., "s_1000_39b516fb"
  realPath: string;       // e.g., "/sample-packs/.../Kick Drum 1.wav"
  packId: string;         // e.g., "ill-will-drumsound-pack-vol-1"
  instrumentId: string;   // e.g., "01-kick-drums"
  fileName: string;       // e.g., "Kick Drum 1.wav"
}

export class SampleSecurity {
  private sampleMappings: Map<string, SecureSampleMapping> = new Map();
  private reverseMapping: Map<string, string> = new Map(); // realPath -> secureId
  private idCounter: number = 1000;

  constructor() {
    console.log('🔒 Sample Security System initialized');
  }

  /**
   * Generate secure ID for a sample URL
   * Format: s_{counter}_{hash}
   */
  generateSecureId(realPath: string, packId: string, instrumentId: string): string {
    // Check if already mapped
    if (this.reverseMapping.has(realPath)) {
      return this.reverseMapping.get(realPath)!;
    }

    // Generate unique secure ID
    const counter = this.idCounter++;
    const hash = this.generateHash(realPath);
    const secureId = `s_${counter}_${hash}`;

    // Extract filename from path
    const fileName = realPath.split('/').pop() || 'unknown.wav';

    // Create mapping
    const mapping: SecureSampleMapping = {
      secureId,
      realPath,
      packId,
      instrumentId,
      fileName
    };

    this.sampleMappings.set(secureId, mapping);
    this.reverseMapping.set(realPath, secureId);

    console.log(`🔒 Mapped: ${fileName} -> ${secureId}`);
    return secureId;
  }

  /**
   * Get real path from secure ID
   */
  getRealPath(secureId: string): string | null {
    const mapping = this.sampleMappings.get(secureId);
    return mapping ? mapping.realPath : null;
  }

  /**
   * Get secure ID from real path
   */
  getSecureId(realPath: string): string | null {
    return this.reverseMapping.get(realPath) || null;
  }

  /**
   * Generate all secure mappings for a pack
   */
  generatePackMappings(packStructure: any, packId: string): Map<string, string> {
    const mappings = new Map<string, string>();

    Object.entries(packStructure).forEach(([instrumentId, samples]: [string, any]) => {
      if (Array.isArray(samples)) {
        samples.forEach((fileName: string) => {
          const realPath = `/sample-packs/${packStructure.packName}/${instrumentId}/${fileName}`;
          const secureId = this.generateSecureId(realPath, packId, instrumentId);
          mappings.set(realPath, secureId);
        });
      }
    });

    console.log(`🔒 Generated ${mappings.size} secure mappings for pack: ${packId}`);
    return mappings;
  }

  /**
   * Get all mappings for debugging (development only)
   */
  getAllMappings(): SecureSampleMapping[] {
    return Array.from(this.sampleMappings.values());
  }

  /**
   * Simple hash function for secure IDs
   */
  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }

  /**
   * Clear all mappings (for testing)
   */
  clearMappings(): void {
    this.sampleMappings.clear();
    this.reverseMapping.clear();
    this.idCounter = 1000;
    console.log('🔒 All sample mappings cleared');
  }

  /**
   * Get statistics
   */
  getStats(): { totalMappings: number; packCount: number; avgMappingsPerPack: number } {
    const packIds = new Set(Array.from(this.sampleMappings.values()).map(m => m.packId));
    
    return {
      totalMappings: this.sampleMappings.size,
      packCount: packIds.size,
      avgMappingsPerPack: packIds.size > 0 ? Math.round(this.sampleMappings.size / packIds.size) : 0
    };
  }
}

// Global instance for the entire application
export const globalSampleSecurity = new SampleSecurity();