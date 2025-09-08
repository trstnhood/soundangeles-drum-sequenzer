/**
 * Professional Audio Types - TypeScript Definitions
 */

export interface AudioSample {
  id: string;
  name: string;
  audioFile: string;
  buffer?: AudioBuffer;
  duration?: number;
}

export interface TrackConfiguration {
  id: string;
  name: string;
  displayName: string;
  color: string;
  samples: AudioSample[];
  defaultSampleId: string;
}

export interface SequencerPattern {
  id: string;
  name: string;
  tracks: Map<string, boolean[]>; // trackId -> 16 step pattern
  bpm: number;
  swing: number;
}

export interface AudioEngineConfig {
  sampleRate: number;
  latencyHint: 'interactive' | 'balanced' | 'playback';
  lookAheadTime: number;
  scheduleAheadTime: number;
}

export interface SamplePackMetadata {
  id: string;
  name: string;
  description: string;
  folderName: string;
  coverImage: string;
  trackCount: number;
  totalSamples: number;
}

export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem: string;
}

export interface AudioEngineStats {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  samplesLoaded: number;
  memoryUsage: string;
  latency: number;
}

export type StepCallback = (trackId: string, sampleId: string, volume: number, time: number) => void;
export type ProgressCallback = (progress: LoadingProgress) => void;
export type ErrorCallback = (error: Error, context: string) => void;