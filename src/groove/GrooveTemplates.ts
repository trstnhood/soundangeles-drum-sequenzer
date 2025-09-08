/**
 * Groove Templates - Simple stub for compatibility
 */

export interface GrooveTemplate {
  id: string;
  name: string;
  description: string;
  bpm: number;
  origin: string;
  trackPatterns: { [trackType: string]: boolean[] };
  sampleAssignments?: { [trackType: string]: string };
  volumeLevels?: { [trackType: string]: number };
}

// Basic templates for compatibility
export const GROOVE_TEMPLATES: GrooveTemplate[] = [
  {
    id: 'basic-boom-bap',
    name: 'Basic Boom Bap',
    description: 'Classic boom bap pattern',
    bpm: 90,
    origin: 'Hip-Hop',
    trackPatterns: {
      kick: [true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
    }
  }
];

// Stub functions for compatibility
export function getGrooveTemplate(templateId: string): GrooveTemplate | null {
  return GROOVE_TEMPLATES.find(t => t.id === templateId) || null;
}

export function getGrooveTemplateForEditor(templateId: string): GrooveTemplate | null {
  return getGrooveTemplate(templateId);
}

export function updateGrooveTemplate(
  templateId: string,
  patterns: { [trackType: string]: boolean[] },
  sampleAssignments: { [trackType: string]: string },
  volumeLevels: { [trackType: string]: number },
  bpm: number
): void {
  // Stub - no actual update for now
  console.log('updateGrooveTemplate called (stub):', templateId);
}

export function updateTemplateName(
  templateId: string,
  newName: string,
  newDescription: string
): void {
  // Stub - no actual update for now
  console.log('updateTemplateName called (stub):', templateId, newName);
}

export function exportModifiedTemplates(): string {
  // Stub - return empty code
  return '// No modified templates to export';
}