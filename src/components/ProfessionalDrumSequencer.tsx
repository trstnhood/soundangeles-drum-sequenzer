/**
 * Professional Drum Sequencer - GM7.1 MP3 DEVELOPMENT VERSION
 * Version: v2.1.2-mp3-dev
 * Date: 2025-09-08
 * 
 * FEATURES:
 * - MP3 Sample Support for Development
 * - All GM7.1 Features Complete
 * - AnimatedKnobs, MIDI Export, Quantization
 * - Desktop Layout Perfection
 * 
 * AUDIO FORMAT: MP3 (for faster development loading)
 * ZERO SYNTHESIS - ONLY REAL SAMPLES
 * Professional timing and dual-state architecture
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Volume2, Package, Copy, Trash2, ChevronLeft, ChevronRight, Download, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfessionalAudioEngine, TrackPattern } from '@/audio/AudioEngine';
import { Midi } from '@tonejs/midi';
import { SampleManager, SamplePack, SampleInfo } from '@/audio/SampleManager';
import { AnimatedKnob } from '@/components/AnimatedKnob';

interface GrooveDot {
  stepIndex: number;
  offsetPercent: number; // -50% (links/rushed) bis +50% (rechts/laid-back)
  offsetMs: number; // Millisekunden für Audio-Timing
}

interface UITrack {
  id: string;
  name: string;
  color: string;
  steps: boolean[];
  volume: number;
  selectedSampleId: string;
  muted: boolean;
  groove: GrooveDot[]; // 16 Groove-Dots für jeden Step
}

interface PatternBank {
  id: string;
  name: string;
  tracks: UITrack[];
  bpm: number;
  lastModified: Date;
}

const STEP_COLORS = [
  'neon-red', 'neon-blue', 'neon-green', 'neon-yellow',
  'neon-purple', 'neon-cyan', 'neon-pink', 'neon-orange',
  'neon-lime', 'neon-indigo'
];

export default function ProfessionalDrumSequencer() {
  // Core system instances
  const audioEngineRef = useRef<ProfessionalAudioEngine>(new ProfessionalAudioEngine());
  const sampleManagerRef = useRef<SampleManager>(new SampleManager());
  
  // UI State (separate from audio state)
  const [tracks, setTracks] = useState<UITrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [availablePacks, setAvailablePacks] = useState<SamplePack[]>([]);
  const [trackSamples, setTrackSamples] = useState<{[trackId: string]: SampleInfo[]}>({});
  
  // Pattern Banks State
  const [patternBanks, setPatternBanks] = useState<PatternBank[]>([]);
  const [currentBankId, setCurrentBankId] = useState<string>('A');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Groove Drag State - REVOLUTIONARY FEATURE
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragTarget, setDragTarget] = useState<{trackId: string, stepIndex: number} | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragCurrentOffset, setDragCurrentOffset] = useState<number>(0);
  
  // Loading states
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedSamples, setLoadedSamples] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  
  // UX ENHANCEMENT STATES - RESTORED FEATURES
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [loadingTracks, setLoadingTracks] = useState<Set<string>>(new Set());
  
  // Visual update timer
  const visualUpdateRef = useRef<number>(0);

  /**
   * Create default groove for a track - all steps straight (centered)
   */
  const createDefaultGroove = (): GrooveDot[] => {
    return Array.from({ length: 16 }, (_, index) => ({
      stepIndex: index,
      offsetPercent: 0, // Centered = straight timing
      offsetMs: 0 // No timing offset
    }));
  };

  /**
   * Update groove offset for a specific step - WITH AUDIO ENGINE SYNC
   */
  const updateGrooveOffset = useCallback((trackId: string, stepIndex: number, offsetPercent: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id !== trackId) return track;
      
      // SAFETY CHECK: Ensure groove array exists
      const currentGroove = track.groove || createDefaultGroove();
      const newGroove = [...currentGroove];
      newGroove[stepIndex] = {
        stepIndex,
        offsetPercent: Math.max(-75, Math.min(75, offsetPercent)), // EXTENDED: Clamp -75% bis +75%
        offsetMs: (offsetPercent / 100) * 30 // Max ±30ms offset
      };
      
      // CRITICAL: Sync groove change to Audio Engine in real-time
      audioEngineRef.current.updateGrooveDot(trackId, stepIndex, offsetPercent);
      
      return { ...track, groove: newGroove };
    }));
  }, []);

  /**
   * QUALITY OF LIFE: Double-click groove dot to reset to straight timing (0%)
   */
  const handleGrooveDoubleClick = useCallback((trackId: string, stepIndex: number) => {
    updateGrooveOffset(trackId, stepIndex, 0); // Reset to straight timing
    console.log(`🎯 Groove reset: track=${trackId}, step=${stepIndex + 1} → 0% (Straight)`);
  }, [updateGrooveOffset]);

  /**
   * QUALITY OF LIFE: Clear entire pattern for a track
   */
  const clearTrackPattern = useCallback((trackId: string) => {
    // Update audio engine immediately
    const track = audioEngineRef.current.getTrack(trackId);
    if (track) {
      // Clear all steps in audio engine
      for (let i = 0; i < 16; i++) {
        audioEngineRef.current.updatePattern(trackId, i, false);
      }
      
      // Update UI state
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, steps: new Array(16).fill(false) }
          : t
      ));

      // Mark as having unsaved changes
      setHasUnsavedChanges(true);
      
      console.log(`🗑️ Pattern cleared for track: ${trackId}`);
    }
  }, []);

  /**
   * Apply groove preset to all tracks
   */
  const applyGroovePreset = useCallback((preset: string) => {
    const groovePatterns: Record<string, number[]> = {
      // Straight timing - all at 0%
      'straight': Array(16).fill(0),
      
      // MPC Swing 16A - subtle swing (54%)
      '16a': [0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8],
      
      // MPC Swing 16B - medium swing (58%)
      '16b': [0, 13, 0, 13, 0, 13, 0, 13, 0, 13, 0, 13, 0, 13, 0, 13],
      
      // MPC Swing 16C - standard swing (62%)
      '16c': [0, 18, 0, 18, 0, 18, 0, 18, 0, 18, 0, 18, 0, 18, 0, 18],
      
      // MPC Swing 16D - heavy swing (66%)
      '16d': [0, 23, 0, 23, 0, 23, 0, 23, 0, 23, 0, 23, 0, 23, 0, 23],
      
      // MPC Swing 16E - extra swing (70%)
      '16e': [0, 28, 0, 28, 0, 28, 0, 28, 0, 28, 0, 28, 0, 28, 0, 28],
      
      // MPC Swing 16F - maximum swing (75%)
      '16f': [0, 33, 0, 33, 0, 33, 0, 33, 0, 33, 0, 33, 0, 33, 0, 33],
      
      // J Dilla Feel - complex micro-timing
      'jdilla': [-10, 15, -5, 25, -15, 20, -8, 18, -12, 22, -7, 20, -10, 15, -5, 25],
      
      // Neo-Soul - laid back with variations
      'neosoul': [0, 25, -10, 30, 5, 20, -5, 35, 0, 25, -10, 30, 5, 20, -5, 35],
      
      // Random Human - natural variations
      'random': Array(16).fill(0).map(() => Math.floor(Math.random() * 30 - 15))
    };

    const selectedGroove = groovePatterns[preset] || groovePatterns['straight'];
    
    // Apply to all tracks
    setTracks(prev => prev.map(track => ({
      ...track,
      groove: selectedGroove.map((offset, index) => ({
        stepIndex: index,
        offsetPercent: offset,
        offsetMs: 0 // Will be calculated by audio engine
      }))
    })));

    // Update audio engine for all tracks
    tracks.forEach(track => {
      selectedGroove.forEach((offset, stepIndex) => {
        audioEngineRef.current.updateGrooveDot(track.id, stepIndex, offset);
      });
    });

    console.log(`🎵 Applied groove preset: ${preset.toUpperCase()}`);
  }, [tracks]);

  /**
   * Export pattern as MIDI file with groove timing
   */
  const exportMIDI = useCallback(() => {
    // Create a new MIDI file
    const midi = new Midi();
    
    // Set tempo
    midi.header.tempos = [{ bpm: bpm, ticks: 0 }];
    midi.header.timeSignatures = [{ timeSignature: [4, 4], ticks: 0 }];
    
    // Map drum tracks to General MIDI drum notes
    const drumMap: Record<string, number> = {
      'kick-drums': 36,     // C1 - Bass Drum 1
      'snares': 38,         // D1 - Acoustic Snare
      'rimshot': 37,        // C#1 - Side Stick
      'hi-hats': 42,        // F#1 - Closed Hi-Hat
      'open-hi-hats': 46,   // A#1 - Open Hi-Hat
      'ride': 51,           // D#2 - Ride Cymbal 1
      'hand-claps': 39,     // D#1 - Hand Clap
      'various-percussions': 47,  // B1 - Low-Mid Tom
      'kickdrum': 36,       // Alternative naming
      'snare': 38,          // Alternative naming
      'hihat': 42,          // Alternative naming
      'openhat': 46,        // Alternative naming
      'clap': 39,           // Alternative naming
      'percussion': 47      // Alternative naming
    };

    // Add a track for each drum sound
    tracks.forEach(track => {
      const midiTrack = midi.addTrack();
      midiTrack.channel = 10; // Drum channel (GM standard)
      midiTrack.name = track.name;
      
      // Get the MIDI note for this drum type
      const noteNumber = drumMap[track.id] || 60; // Default to C4 if not mapped
      
      // Calculate timing for 16 steps over 1 bar
      const ticksPerStep = midi.header.ppq / 4; // 16th notes
      
      // Add notes for active steps with groove timing
      track.steps.forEach((active, stepIndex) => {
        if (active) {
          // Get groove offset for this step
          const grooveOffset = track.groove[stepIndex]?.offsetPercent || 0;
          const grooveOffsetTicks = (grooveOffset / 100) * ticksPerStep * 0.75; // Apply groove
          
          const startTick = stepIndex * ticksPerStep + grooveOffsetTicks;
          
          midiTrack.addNote({
            midi: noteNumber,
            time: startTick / midi.header.ppq, // Convert to quarter notes
            duration: 0.1, // Short duration for drums
            velocity: track.volume
          });
        }
      });
    });

    // Convert to MIDI file bytes
    const midiArray = midi.toArray();
    const blob = new Blob([midiArray], { type: 'audio/midi' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-${currentBankId}-${Date.now()}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`🎹 MIDI exported: pattern-${currentBankId}.mid`);
  }, [tracks, bpm, currentBankId]);

  /**
   * REVOLUTIONARY DRAG & DROP GROOVE EDITING
   * Handle mouse down on groove dots - J Dilla Style Programming
   */
  const handleGrooveDragStart = useCallback((e: React.MouseEvent, trackId: string, stepIndex: number) => {
    e.preventDefault();
    setIsDragging(true);
    setDragTarget({ trackId, stepIndex });
    setDragStartX(e.clientX);
    
    // Get current offset
    const track = tracks.find(t => t.id === trackId);
    const currentOffset = track?.groove[stepIndex]?.offsetPercent || 0;
    setDragCurrentOffset(currentOffset);
    
    console.log(`🎯 Starting groove drag: track=${trackId}, step=${stepIndex}, currentOffset=${currentOffset}%`);
  }, [tracks]);

  /**
   * Handle mouse move during groove drag
   */
  const handleGrooveDragMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragTarget) return;
    
    const deltaX = e.clientX - dragStartX;
    const sensitivity = 1.0; // 1px = 1% offset
    const newOffset = dragCurrentOffset + (deltaX * sensitivity);
    const clampedOffset = Math.max(-75, Math.min(75, newOffset)); // EXTENDED to ±75%
    
    // Real-time visual update
    updateGrooveOffset(dragTarget.trackId, dragTarget.stepIndex, clampedOffset);
    
    console.log(`🎯 Groove drag move: deltaX=${deltaX}px, newOffset=${clampedOffset}%`);
  }, [isDragging, dragTarget, dragStartX, dragCurrentOffset, updateGrooveOffset]);

  /**
   * Handle mouse up - end groove drag
   */
  const handleGrooveDragEnd = useCallback(() => {
    if (isDragging && dragTarget) {
      console.log(`🎯 Finished groove drag: track=${dragTarget.trackId}, step=${dragTarget.stepIndex}`);
    }
    
    setIsDragging(false);
    setDragTarget(null);
    setDragStartX(0);
    setDragCurrentOffset(0);
  }, [isDragging, dragTarget]);

  /**
   * Global mouse events for smooth drag operations
   */
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!dragTarget) return;
        
        const deltaX = e.clientX - dragStartX;
        const sensitivity = 1.0;
        const newOffset = dragCurrentOffset + (deltaX * sensitivity);
        const clampedOffset = Math.max(-75, Math.min(75, newOffset)); // EXTENDED to ±75%
        
        updateGrooveOffset(dragTarget.trackId, dragTarget.stepIndex, clampedOffset);
      };
      
      const handleMouseUp = () => {
        handleGrooveDragEnd();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragTarget, dragStartX, dragCurrentOffset, updateGrooveOffset, handleGrooveDragEnd]);

  /**
   * Initialize pattern banks with default banks A, B, C, D
   */
  const initializePatternBanks = useCallback((initialTracks: UITrack[], initialBpm: number) => {
    const bankNames = ['A', 'B', 'C', 'D'];
    const defaultBanks: PatternBank[] = bankNames.map(name => ({
      id: name,
      name: `Pattern ${name}`,
      tracks: initialTracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false), // Empty pattern
        groove: createDefaultGroove() // CRITICAL FIX: Ensure groove array exists
      })),
      bpm: initialBpm,
      lastModified: new Date()
    }));

    // Set first bank to have the current pattern
    if (defaultBanks.length > 0) {
      defaultBanks[0].tracks = [...initialTracks];
    }

    setPatternBanks(defaultBanks);
    setCurrentBankId('A');
    setHasUnsavedChanges(false);
  }, []);

  /**
   * Save current pattern to the active bank
   */
  const saveCurrentPatternToBank = useCallback(() => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === currentBankId 
        ? { 
            ...bank, 
            tracks: [...tracks],
            bpm: bpm,
            lastModified: new Date()
          }
        : bank
    ));
    setHasUnsavedChanges(false);
    console.log(`💾 Pattern saved to Bank ${currentBankId}`);
  }, [currentBankId, tracks, bpm]);

  /**
   * Load pattern from bank - WITH AUTO-SAVE
   */
  const loadPatternFromBank = useCallback((bankId: string) => {
    const bank = patternBanks.find(b => b.id === bankId);
    if (!bank) return;

    // CRITICAL FIX: Auto-save current pattern before switching
    if (bankId !== currentBankId) {
      console.log(`💾 Auto-saving current pattern in Bank ${currentBankId} before switch`);
      // Immediate save with current state
      setPatternBanks(prev => prev.map(bank => 
        bank.id === currentBankId 
          ? { 
              ...bank, 
              tracks: [...tracks],
              bpm: bpm,
              lastModified: new Date()
            }
          : bank
      ));
    }

    // SEAMLESS SWITCH: No playback interruption for live performance!

    // Load pattern into audio engine
    bank.tracks.forEach(track => {
      // CRITICAL FIX: Clear all steps properly (0-15, not -1!)
      for (let stepIndex = 0; stepIndex < 16; stepIndex++) {
        audioEngineRef.current.updatePattern(track.id, stepIndex, false);
      }
      // Then set active steps
      track.steps.forEach((active, stepIndex) => {
        if (active) {
          audioEngineRef.current.updatePattern(track.id, stepIndex, true);
        }
      });
      audioEngineRef.current.updateVolume(track.id, track.volume);
      audioEngineRef.current.updateSelectedSample(track.id, track.selectedSampleId);
    });

    // Update UI state
    setTracks(bank.tracks);
    setBpm(bank.bpm);
    audioEngineRef.current.setBpm(bank.bpm);
    setCurrentBankId(bankId);
    setHasUnsavedChanges(false);

    console.log(`📂 Pattern loaded from Bank ${bankId}`);
  }, [patternBanks, isPlaying, currentBankId, tracks, bpm]);

  /**
   * Copy pattern from one bank to another - USES CURRENT LIVE TRACKS
   */
  const copyPatternToBank = useCallback((fromBankId: string, toBankId: string) => {
    // CRITICAL FIX: If copying from current bank, use LIVE tracks state
    // instead of saved bank tracks to include unsaved changes
    if (fromBankId === currentBankId) {
      console.log(`📋 Copying LIVE pattern from current Bank ${fromBankId} to Bank ${toBankId}`);
      
      setPatternBanks(prev => prev.map(bank => 
        bank.id === toBankId 
          ? { 
              ...bank, 
              tracks: [...tracks], // Use CURRENT live tracks
              bpm: bpm, // Use CURRENT live BPM
              lastModified: new Date()
            }
          : bank
      ));
    } else {
      // If copying from a non-current bank, use saved tracks
      const fromBank = patternBanks.find(b => b.id === fromBankId);
      if (!fromBank) return;

      console.log(`📋 Copying saved pattern from Bank ${fromBankId} to Bank ${toBankId}`);
      
      setPatternBanks(prev => prev.map(bank => 
        bank.id === toBankId 
          ? { 
              ...bank, 
              tracks: [...fromBank.tracks],
              bpm: fromBank.bpm,
              lastModified: new Date()
            }
          : bank
      ));
    }

    console.log(`📋 Pattern copied from Bank ${fromBankId} to Bank ${toBankId}`);
  }, [patternBanks, currentBankId, tracks, bpm]);

  /**
   * Clear pattern in bank
   */
  const clearPatternInBank = useCallback((bankId: string) => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === bankId 
        ? { 
            ...bank, 
            tracks: bank.tracks.map(track => ({
              ...track,
              steps: new Array(16).fill(false)
            })),
            lastModified: new Date()
          }
        : bank
    ));

    // If clearing current bank, update current pattern too
    if (bankId === currentBankId) {
      const clearedTracks = tracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false)
      }));
      setTracks(clearedTracks);
      
      // Clear audio engine
      tracks.forEach(track => {
        audioEngineRef.current.updatePattern(track.id, -1, false); // Clear all steps
      });
    }

    console.log(`🗑️ Pattern cleared in Bank ${bankId}`);
  }, [currentBankId, tracks]);

  /**
   * Initialize the sequencer system
   */
  useEffect(() => {
    const initializeSequencer = async () => {
      console.log('🚀 Initializing Professional Drum Sequencer...');
      
      try {
        // Discover available sample packs
        const packs = await sampleManagerRef.current.discoverPacks();
        setAvailablePacks(packs);
        
        if (packs.length > 0) {
          // Load first pack by default
          await loadSamplePack(packs[0].id);
        } else {
          console.error('❌ No sample packs found!');
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('❌ Sequencer initialization failed:', error);
        setIsInitializing(false);
      }
    };

    initializeSequencer();

    // Cleanup on unmount
    return () => {
      audioEngineRef.current.dispose();
    };
  }, []);


  /**
   * Load a complete sample pack - PRESERVES EXISTING PATTERNS
   */
  const loadSamplePack = useCallback(async (packId: string) => {
    console.log(`📦 Loading sample pack: ${packId}`);
    setIsLoadingPack(true);
    setLoadingProgress(0);
    setLoadedSamples(0);
    
    try {
      // Get new pack structure
      const newTrackPatterns = await sampleManagerRef.current.createTrackPatterns(packId);
      console.log(`🎵 Found ${newTrackPatterns.length} tracks in new pack`);
      
      if (newTrackPatterns.length === 0) {
        throw new Error('No tracks found in sample pack');
      }

      // PRESERVE EXISTING PATTERNS: Map current patterns to new pack structure
      let preservedTracks: UITrack[];
      
      console.log(`🔍 DEBUG: tracks.length = ${tracks.length}, tracks:`, tracks.map(t => `${t.id}:${t.steps.filter(s => s).length}`));
      
      if (tracks.length > 0) {
        console.log(`🔄 Preserving ${tracks.length} existing patterns for new pack`);
        
        // Map existing tracks to new pack tracks (match by instrument type/index)
        preservedTracks = newTrackPatterns.map((newPattern, index) => {
          // Try to find matching track from current patterns
          const existingTrack = tracks[index]; // NO FALLBACK - let new tracks be empty
          
          return {
            ...newPattern, // New pack structure (id, name, samples)
            steps: existingTrack ? [...existingTrack.steps] : new Array(16).fill(false), // PRESERVE pattern OR empty
            volume: existingTrack ? existingTrack.volume : 0.7, // PRESERVE volume OR default
            groove: existingTrack ? [...existingTrack.groove] : createDefaultGroove(), // PRESERVE groove OR default
            muted: existingTrack ? existingTrack.muted : false // PRESERVE mute state OR default
          };
        });
        
        console.log(`✅ Pattern preserved: ${preservedTracks.filter(t => t.steps.some(s => s)).length} tracks have active steps`);
      } else {
        // No existing patterns - create fresh ones
        preservedTracks = newTrackPatterns.map(pattern => ({
          ...pattern,
          groove: createDefaultGroove()
        }));
        console.log(`🆕 Created fresh patterns for ${preservedTracks.length} tracks`);
      }
      
      // CRITICAL: Initialize audio engine with preserved patterns
      audioEngineRef.current.initializeTracks(preservedTracks);
      
      // Set UI state with preserved patterns
      setTracks(preservedTracks);
      setSelectedPack(packId);
      setTotalSamples(newTrackPatterns.length);
      
      // Load default samples for each track
      await preloadDefaultSamples(packId, preservedTracks);
      
      // Load sample options for dropdowns
      await loadTrackSampleOptions(packId, preservedTracks);
      
      // ALWAYS preserve patterns when switching sample packs
      if (patternBanks.length === 0) {
        console.log('🆕 Initializing pattern banks for first time');
        initializePatternBanks(preservedTracks, bpm);
      } else {
        console.log('🔄 Updating existing pattern banks with new sample pack structure');
        // PRESERVE PATTERNS IN ALL BANKS: Update existing pattern banks with new pack structure
        setPatternBanks(prev => prev.map(bank => ({
          ...bank,
          tracks: bank.tracks.map((bankTrack, index) => {
            // Find matching new track by index
            const newTrack = preservedTracks[index];
            if (newTrack) {
              return {
                ...newTrack, // New pack structure (id, name, samples)
                steps: [...bankTrack.steps], // PRESERVE existing pattern
                volume: bankTrack.volume, // PRESERVE volume
                groove: [...bankTrack.groove], // PRESERVE groove
                muted: bankTrack.muted // PRESERVE mute state
              };
            }
            return bankTrack; // Keep unchanged if no matching track
          })
        })));
        
        // Update current bank ID to reflect preserved patterns
        const currentBank = patternBanks.find(b => b.id === currentBankId);
        if (currentBank) {
          console.log(`✅ Pattern preservation: Bank ${currentBankId} patterns maintained`);
        }
      }
      
      // CRITICAL FIX: If banks were somehow lost, rebuild them with preserved patterns
      if (patternBanks.length === 0) {
        console.log('🚨 EMERGENCY: Pattern banks lost, rebuilding with preserved patterns');
        initializePatternBanks(preservedTracks, bpm);
      }
      
      setIsInitializing(false);
      setIsLoadingPack(false);
      
      console.log(`✅ Sample pack loaded with preserved patterns: ${preservedTracks.length} tracks`);
      
    } catch (error) {
      console.error(`❌ Failed to load sample pack ${packId}:`, error);
      setIsLoadingPack(false);
      setIsInitializing(false);
    }
  }, [tracks]); // CRITICAL FIX: Add tracks dependency for pattern preservation

  /**
   * Preload default samples for immediate playback
   */
  const preloadDefaultSamples = async (packId: string, trackPatterns: UITrack[]) => {
    console.log('🔄 Preloading default samples...');
    
    let loadedCount = 0;
    const loadPromises = trackPatterns.map(async (track) => {
      try {
        const defaultSample = await sampleManagerRef.current.getDefaultSample(packId, track.id);
        if (defaultSample) {
          await audioEngineRef.current.loadSample(defaultSample.audioFile);
          loadedCount++;
          setLoadedSamples(loadedCount);
          setLoadingProgress(Math.round((loadedCount / trackPatterns.length) * 100));
        }
      } catch (error) {
        console.error(`❌ Failed to preload sample for ${track.name}:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    console.log(`✅ Preloaded ${loadedCount}/${trackPatterns.length} default samples`);
  };

  /**
   * Load sample options for dropdowns
   */
  const loadTrackSampleOptions = async (packId: string, trackPatterns: UITrack[]) => {
    const sampleOptions: {[trackId: string]: SampleInfo[]} = {};
    
    for (const track of trackPatterns) {
      try {
        const samples = await sampleManagerRef.current.getTrackSamples(packId, track.id);
        sampleOptions[track.id] = samples;
      } catch (error) {
        console.error(`❌ Failed to load samples for ${track.name}:`, error);
        sampleOptions[track.id] = [];
      }
    }
    
    setTrackSamples(sampleOptions);
  };

  /**
   * Set up audio engine callback for step playback
   */
  useEffect(() => {
    audioEngineRef.current.onStepCallback = async (trackId: string, sampleId: string, volume: number, time: number) => {
      try {
        // Find the sample info
        const samples = trackSamples[trackId] || [];
        const sampleInfo = samples.find(s => s.id === sampleId);
        
        if (sampleInfo) {
          audioEngineRef.current.playSample(sampleInfo.audioFile, volume, time);
        } else {
          console.warn(`⚠️ Sample not found: ${sampleId} for track ${trackId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to play sample ${sampleId}:`, error);
      }
    };
  }, [trackSamples]);

  /**
   * Visual update loop
   */
  useEffect(() => {
    const updateVisuals = () => {
      if (audioEngineRef.current.isEnginePlaying()) {
        setCurrentStep(audioEngineRef.current.getCurrentStep());
        visualUpdateRef.current = requestAnimationFrame(updateVisuals);
      }
    };

    if (isPlaying) {
      visualUpdateRef.current = requestAnimationFrame(updateVisuals);
    } else {
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
      }
    }

    return () => {
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
      }
    };
  }, [isPlaying]);

  /**
   * Transport controls
   */
  const handlePlay = useCallback(async () => {
    // Sequencer sollte IMMER laufen können, auch ohne aktivierte Pads (Hardware-Verhalten)
    try {
      await audioEngineRef.current.start();
      setIsPlaying(true);
      console.log('▶️ Playback started - running in idle mode (hardware behavior)');
    } catch (error) {
      console.error('❌ Failed to start audio engine:', error);
    }
  }, []);

  // Pause removed - only Play/Stop needed

  const handleStop = useCallback(() => {
    audioEngineRef.current.stop();
    setIsPlaying(false);
    setCurrentStep(0);
    console.log('⏹️ Playback stopped and reset');
  }, []);

  /**
   * Pattern editing
   */
  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    // Update audio engine immediately
    const track = audioEngineRef.current.getTrack(trackId);
    if (track) {
      const newValue = !track.steps[stepIndex];
      audioEngineRef.current.updatePattern(trackId, stepIndex, newValue);
      
      // Update UI state
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, steps: t.steps.map((step, idx) => idx === stepIndex ? newValue : step) }
          : t
      ));

      // Mark as having unsaved changes
      setHasUnsavedChanges(true);
    }
  }, []);

  /**
   * Volume control
   */
  const updateVolume = useCallback((trackId: string, volume: number) => {
    const normalizedVolume = volume / 100;
    
    // Update audio engine immediately
    audioEngineRef.current.updateVolume(trackId, normalizedVolume);
    
    // Update UI state
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, volume: normalizedVolume } : t
    ));

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }, []);

  /**
   * KEYBOARD SHORTCUTS SYSTEM - RESTORED UX FEATURE
   * Up/Down: Track navigation, Left/Right: Volume control, 1-8/Q-I: Pad toggle, Space: Play/Stop
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default only for our shortcuts
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) ||
          /^[1-8qwertyui]$/i.test(e.key)) {
        e.preventDefault();
      }

      // TRACK NAVIGATION (Up/Down)
      if (e.key === 'ArrowUp') {
        if (selectedTrackIndex !== null && selectedTrackIndex > 0) {
          setSelectedTrackIndex(selectedTrackIndex - 1);
          console.log(`⌨️ Track UP: ${tracks[selectedTrackIndex - 1]?.name} selected`);
        } else if (tracks.length > 0) {
          setSelectedTrackIndex(tracks.length - 1);
          console.log(`⌨️ Track UP: Wrapped to last → ${tracks[tracks.length - 1]?.name}`);
        }
        return;
      }
      
      if (e.key === 'ArrowDown') {
        if (selectedTrackIndex !== null && selectedTrackIndex < tracks.length - 1) {
          setSelectedTrackIndex(selectedTrackIndex + 1);
          console.log(`⌨️ Track DOWN: ${tracks[selectedTrackIndex + 1]?.name} selected`);
        } else if (tracks.length > 0) {
          setSelectedTrackIndex(0);
          console.log(`⌨️ Track DOWN: Wrapped to first → ${tracks[0]?.name}`);
        }
        return;
      }

      // VOLUME CONTROL (Left/Right)
      if (selectedTrackIndex !== null && tracks[selectedTrackIndex]) {
        const selectedTrack = tracks[selectedTrackIndex];
        
        if (e.key === 'ArrowLeft') {
          // Volume ist als 0-1 gespeichert, aber updateVolume erwartet 0-100
          const currentVolumePercent = Math.round(selectedTrack.volume * 100);
          const newVolumePercent = Math.max(0, currentVolumePercent - 10);
          updateVolume(selectedTrack.id, newVolumePercent);
          console.log(`⌨️ Volume LEFT (leiser): ${selectedTrack.name} → ${newVolumePercent}%`);
          return;
        }
        
        if (e.key === 'ArrowRight') {
          // Volume ist als 0-1 gespeichert, aber updateVolume erwartet 0-100
          const currentVolumePercent = Math.round(selectedTrack.volume * 100);
          const newVolumePercent = Math.min(100, currentVolumePercent + 10);
          updateVolume(selectedTrack.id, newVolumePercent);
          console.log(`⌨️ Volume RIGHT (lauter): ${selectedTrack.name} → ${newVolumePercent}%`);
          return;
        }
      }

      // PAD ACTIVATION (1-8 for pads 1-8, Q-I for pads 9-16)
      if (selectedTrackIndex !== null && tracks[selectedTrackIndex]) {
        const selectedTrack = tracks[selectedTrackIndex];
        let padIndex = -1;
        
        // Numbers 1-8 for pads 1-8
        if (/^[1-8]$/.test(e.key)) {
          padIndex = parseInt(e.key) - 1; // Convert to 0-based
        }
        // Letters Q-I for pads 9-16
        else if (/^[qwertyui]$/i.test(e.key.toLowerCase())) {
          const keyMap = 'qwertyui';
          padIndex = keyMap.indexOf(e.key.toLowerCase()) + 8; // +8 for pads 9-16
        }
        
        if (padIndex !== -1) {
          toggleStep(selectedTrack.id, padIndex);
          const isActive = selectedTrack.steps[padIndex];
          console.log(`⌨️ Pad ${padIndex + 1}: ${isActive ? 'activated' : 'deactivated'} on ${selectedTrack.name}`);
          return;
        }
      }

      // TRANSPORT CONTROL (Space for Play/Stop)
      if (e.key === ' ') {
        if (isPlaying) {
          handleStop();
          console.log('⌨️ SPACE: Playback stopped');
        } else {
          handlePlay();
          console.log('⌨️ SPACE: Playback started');
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackIndex, tracks, isPlaying, toggleStep, updateVolume, handlePlay, handleStop]);


  /**
   * Sample selection
   */
  const updateSelectedSample = useCallback(async (trackId: string, sampleId: string) => {
    // Update audio engine
    audioEngineRef.current.updateSelectedSample(trackId, sampleId);
    
    // Preload the new sample
    const samples = trackSamples[trackId] || [];
    const sampleInfo = samples.find(s => s.id === sampleId);
    if (sampleInfo) {
      try {
        await audioEngineRef.current.loadSample(sampleInfo.audioFile);
      } catch (error) {
        console.error(`❌ Failed to load sample ${sampleId}:`, error);
      }
    }
    
    // Update UI state
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, selectedSampleId: sampleId } : t
    ));

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }, [trackSamples]);

  /**
   * BPM control
   */
  const updateBpm = useCallback((newBpm: number) => {
    audioEngineRef.current.setBpm(newBpm);
    setBpm(newBpm);
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Cycle through samples (Hardware-style navigation)
   */
  const cycleSample = useCallback((trackId: string, direction: number) => {
    const samples = trackSamples[trackId] || [];
    if (samples.length <= 1) return;
    
    const track = audioEngineRef.current.getTrack(trackId);
    if (!track) return;
    
    const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
    let newIndex = currentIndex + direction;
    
    // Wrap around
    if (newIndex >= samples.length) newIndex = 0;
    if (newIndex < 0) newIndex = samples.length - 1;
    
    const newSample = samples[newIndex];
    if (newSample) {
      updateSelectedSample(trackId, newSample.id);
    }
  }, [trackSamples, updateSelectedSample]);

  /**
   * Manual sample trigger
   */
  const triggerSample = useCallback(async (trackId: string) => {
    const track = audioEngineRef.current.getTrack(trackId);
    if (!track) return;
    
    const samples = trackSamples[trackId] || [];
    const sampleInfo = samples.find(s => s.id === track.selectedSampleId);
    
    if (sampleInfo) {
      audioEngineRef.current.playSample(sampleInfo.audioFile, track.volume);
    }
  }, [trackSamples]);

  /**
   * Pack switching
   */
  const switchPack = useCallback(async (packId: string) => {
    console.log(`🔄 Switching to pack: ${packId}`);
    
    // Stop playback
    if (isPlaying) {
      handleStop();
    }
    
    // Load new pack
    await loadSamplePack(packId);
  }, [isPlaying, handleStop, loadSamplePack]);

  // Loading screen
  if (isInitializing || isLoadingPack) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Music className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isInitializing ? 'Initializing Sequencer...' : 'Loading Sample Pack...'}
          </h2>
          
          {isLoadingPack && (
            <>
              <div className="w-full bg-muted rounded-full h-4 mb-4">
                <div 
                  className="bg-primary h-4 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-muted-foreground">
                {loadedSamples} / {totalSamples} samples loaded ({loadingProgress}%)
              </p>
            </>
          )}
          
          <p className="text-muted-foreground mt-2">
            Professional drum machine loading...
          </p>
        </div>
      </div>
    );
  }

  // Main sequencer interface
  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
            SoundAngeles Professional Sequencer
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            ZERO SYNTHESIS • ONLY REAL SAMPLES • {tracks.length} TRACKS
          </p>
        </div>

        {/* Hero Cover-Based Sample Pack Selector */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4">
            {/* Previous Pack Button */}
            <Button 
              onClick={() => {
                const currentIndex = availablePacks.findIndex(pack => pack.id === selectedPack);
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : availablePacks.length - 1;
                switchPack(availablePacks[prevIndex].id);
              }}
              size="lg"
              variant="outline"
              className="h-16 w-16 rounded-full"
              title="Previous Sample Pack"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            {/* Cover Image - Mobile Responsive */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-lg border-2 border-border overflow-hidden bg-muted shadow-xl">
                <img 
                  src={(() => {
                    const pack = availablePacks.find(pack => pack.id === selectedPack);
                    if (pack && pack.coverImage && pack.coverImage !== 'default-cover.png') {
                      return `/sample-packs/${encodeURIComponent(pack.folderName)}/${encodeURIComponent(pack.coverImage)}`;
                    }
                    return '/sample-packs/default-cover.png';
                  })()}
                  alt={`${availablePacks.find(pack => pack.id === selectedPack)?.name || 'Sample Kit'} Cover`}
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
                  onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    const pack = availablePacks.find(pack => pack.id === selectedPack);
                    
                    if (pack && pack.folderName && !currentSrc.includes('cover.jpg') && !currentSrc.includes('default-cover.png')) {
                      e.currentTarget.src = `/sample-packs/${encodeURIComponent(pack.folderName)}/cover.jpg`;
                    } else if (!currentSrc.includes('default-cover.png')) {
                      e.currentTarget.src = '/sample-packs/default-cover.png';
                    } else {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMUEyMzJBIi8+Cjxwb2x5Z29uIHBvaW50cz0iMTAwIDUwIDEyNSA4NSA3NSA4NSIgZmlsbD0iIzM3NEE1MSIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjEwIiBmaWxsPSIjNjM3Mzk5Ii8+CjxwYXRoIGQ9Ik02MCAzNGgxNXYxMEg2MFYzNHoiIGZpbGw9IiM2Mzc0OTkiLz4KPHRleHQgeD0iMTAwIiB5PSIxNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM2Mzc0OTkiPk5vIENvdmVyPC90ZXh0Pgo8L3N2Zz4=';
                    }
                  }}
                />
              </div>
              
              {/* Pack Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">
                  {availablePacks.find(pack => pack.id === selectedPack)?.name || 'Sample Kit'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {availablePacks.find(pack => pack.id === selectedPack)?.description || 'Professional drum samples'}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  {availablePacks.findIndex(pack => pack.id === selectedPack) + 1} / {availablePacks.length}
                </div>
                
                {/* E-Commerce Button */}
                <Button
                  className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => {
                    // TODO: WooCommerce Integration - Add to Cart function
                    const currentPack = availablePacks.find(pack => pack.id === selectedPack);
                    console.log(`🛒 Add to Cart: ${currentPack?.name}`);
                    // Placeholder for WooCommerce integration
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  In den Warenkorb
                </Button>
              </div>
            </div>

            {/* Next Pack Button */}
            <Button 
              onClick={() => {
                const currentIndex = availablePacks.findIndex(pack => pack.id === selectedPack);
                const nextIndex = currentIndex < availablePacks.length - 1 ? currentIndex + 1 : 0;
                switchPack(availablePacks[nextIndex].id);
              }}
              size="lg"
              variant="outline"
              className="h-16 w-16 rounded-full"
              title="Next Sample Pack"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* New Redesigned Control Layout - Mobile Responsive */}
        <div className="flex flex-col md:flex-row items-center w-full px-3 md:px-8 gap-3 md:gap-0">
          {/* Left Group: Pattern Banks + COPY/CLEAR Controls */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Vintage Pattern Bank Switches A-D */}
            <div className="flex gap-1 items-end">
              {patternBanks.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => loadPatternFromBank(bank.id)}
                  className="w-8 h-12 md:w-10 md:h-16 p-0 border-none bg-transparent"
                  style={{
                    backgroundImage: `url(/ui-elements/controls/${
                      currentBankId === bank.id 
                        ? `bank-switch-${bank.id.toLowerCase()}.svg`
                        : 'bank-switch-inactive.svg'
                    })`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                  title={`Load Pattern ${bank.id}`}
                  aria-label={`Pattern Bank ${bank.id}${currentBankId === bank.id ? ' (Active)' : ''}`}
                />
              ))}
            </div>

            {/* COPY and CLEAR Controls */}
            <div className="flex items-center gap-2">
              {/* COPY Button (first) */}
              <Select onValueChange={(toBankId) => copyPatternToBank(currentBankId, toBankId)}>
                <SelectTrigger className="w-20 md:w-24 h-8 text-xs gap-1">
                  <Copy className="w-3 h-3" />
                  <SelectValue placeholder="COPY" />
                </SelectTrigger>
                <SelectContent>
                  {patternBanks.filter(b => b.id !== currentBankId).map(bank => (
                    <SelectItem key={bank.id} value={bank.id} className="text-xs">
                      to {bank.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* CLEAR Button with Dropdown (second) */}
              <Select onValueChange={(bankId) => clearPatternInBank(bankId)}>
                <SelectTrigger className="w-20 md:w-24 h-8 text-xs gap-1">
                  <Trash2 className="w-3 h-3" />
                  <SelectValue placeholder="CLEAR" />
                </SelectTrigger>
                <SelectContent>
                  {patternBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id} className="text-xs">
                      Clear {bank.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* GROOVE Presets (new) */}
              <Select onValueChange={(preset) => applyGroovePreset(preset)}>
                <SelectTrigger className="w-24 md:w-32 h-8 text-xs gap-1">
                  <Music className="w-3 h-3" />
                  <SelectValue placeholder="GROOVE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight" className="text-xs">Straight (0%)</SelectItem>
                  <SelectItem value="16a" className="text-xs">Swing 16A (54%)</SelectItem>
                  <SelectItem value="16b" className="text-xs">Swing 16B (58%)</SelectItem>
                  <SelectItem value="16c" className="text-xs">Swing 16C (62%)</SelectItem>
                  <SelectItem value="16d" className="text-xs">Swing 16D (66%)</SelectItem>
                  <SelectItem value="16e" className="text-xs">Swing 16E (70%)</SelectItem>
                  <SelectItem value="16f" className="text-xs">Swing 16F (75%)</SelectItem>
                  <SelectItem value="jdilla" className="text-xs">J Dilla Feel</SelectItem>
                  <SelectItem value="neosoul" className="text-xs">Neo-Soul</SelectItem>
                  <SelectItem value="random" className="text-xs">Random Human</SelectItem>
                </SelectContent>
              </Select>

              {/* MIDI Export Button */}
              <Button
                onClick={exportMIDI}
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1"
                title="Export pattern as MIDI"
              >
                <Download className="w-3 h-3" />
                <span>MIDI</span>
              </Button>
            </div>
          </div>

          {/* Spacer - Hidden on mobile */}
          <div className="hidden md:flex flex-1"></div>

          {/* Right Group: BPM Display + Play Button */}
          <div className="flex items-center gap-2 md:gap-4">
            
            
            {/* Vintage BPM Knob */}
            <div className="flex flex-col items-center gap-1">
              <button 
                className="w-12 h-16 md:w-16 md:h-20 p-0 border-none bg-transparent relative group"
                style={{
                  backgroundImage: 'url(/ui-elements/knobs/bpm-knob.svg)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
                onClick={() => {
                  // Cycle through common BPM values: 100, 110, 120, 130, 140, 120
                  const bpmCycle = [100, 110, 120, 130, 140];
                  const currentIndex = bpmCycle.indexOf(bpm);
                  const nextBpm = bpmCycle[(currentIndex + 1) % bpmCycle.length];
                  updateBpm(nextBpm);
                }}
                aria-label={`BPM: ${bpm}`}
              />
              <div className="text-xs font-mono text-center text-green-400 bg-black px-1 rounded">
                {bpm}
              </div>
            </div>

            {/* Vintage Transport Controls */}
            <div className="flex items-center gap-2">
              {!isPlaying ? (
                <button 
                  onClick={handlePlay}
                  className="w-12 h-12 md:w-16 md:h-16 p-0 border-none bg-transparent"
                  style={{
                    backgroundImage: 'url(/ui-elements/controls/play-button.svg)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                  aria-label="Play"
                />
              ) : (
                <button 
                  onClick={handleStop}
                  className="w-12 h-12 md:w-16 md:h-16 p-0 border-none bg-transparent"
                  style={{
                    backgroundImage: 'url(/ui-elements/controls/stop-button.svg)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                  aria-label="Stop"
                />
              )}
            </div>
          </div>
        </div>


        {/* Track Grid - Responsive Layout */}
        <div className="space-y-6">
          {tracks.map((track, trackIndex) => (
            <div 
              key={track.id} 
              className={`bg-card rounded-lg p-2 md:p-4 border relative cursor-pointer transition-all duration-300 ${
                selectedTrackIndex === trackIndex 
                  ? 'border-yellow-500/50' 
                  : 'border-border'
              }`}
              onClick={() => setSelectedTrackIndex(trackIndex)}
            >
              {/* LED INDICATOR - INNERHALB DER SPUR */}
              <div className={`
                absolute left-3 top-3 w-2 h-2 rounded-full transition-all duration-300 z-20
                ${selectedTrackIndex === trackIndex 
                  ? 'bg-yellow-500 shadow-md shadow-yellow-500/50' 
                  : 'bg-gray-600'
                }
              `} />
              
              {/* Track Layout - Mobile Responsive */}
              <div className="mb-2 md:mb-4">
                {/* Desktop: Track Display zentriert, Volume Slider präzise positioniert */}
                <div className="hidden xl:block mb-2 md:mb-4 relative">
                  {/* Container für perfekte Alignment mit Pads */}
                  <div className="flex items-center justify-between">
                    {/* Track Display - absolut zentriert */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1 md:gap-2 z-10">
                      <div className="bg-black/50 border-2 border-muted rounded px-3 py-2 font-mono text-center min-w-[140px] md:min-w-[200px]">
                        <div className="text-primary font-bold text-sm md:text-base truncate leading-tight">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentSample = samples.find(s => s.id === track.selectedSampleId);
                            return currentSample?.name || 'No Sample';
                          })()}
                        </div>
                        <div className="text-sm md:text-base text-muted-foreground">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                            return `${currentIndex + 1}/${samples.length}`;
                          })()}
                        </div>
                      </div>
                      
                      {/* Sample Navigation */}
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => cycleSample(track.id, -1)}
                          className="w-5 h-4 md:w-6 md:h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Previous Sample"
                        >
                          <span className="text-xs">▲</span>
                        </button>
                        <button 
                          onClick={() => cycleSample(track.id, 1)}
                          className="w-5 h-4 md:w-6 md:h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Next Sample"
                        >
                          <span className="text-xs">▼</span>
                        </button>
                      </div>
                    </div>

                    {/* Volume Control - präzise bündig mit rechter Pad-Kante */}
                    <div className="ml-auto flex items-center gap-2" style={{ marginRight: '40px' }}>
                      <AnimatedKnob
                        value={track.volume * 100}
                        size={50}
                        type="slider"
                        onValueChange={(percentage) => {
                          updateVolume(track.id, percentage);
                        }}
                        onClick={() => {
                          // Fallback: Cycle through volume levels: 0%, 30%, 50%, 70%, 100%
                          const volumeLevels = [0.0, 0.3, 0.5, 0.7, 1.0];
                          const currentIndex = volumeLevels.findIndex(v => Math.abs(v - track.volume) < 0.1);
                          const nextVolume = volumeLevels[(currentIndex + 1) % volumeLevels.length];
                          updateVolume(track.id, nextVolume * 100);
                        }}
                        ariaLabel={`Volume: ${Math.round(track.volume * 100)}%`}
                        className="w-48 h-11 md:w-56 md:h-13"
                      />
                      <div className="text-sm md:text-base text-muted-foreground text-center min-w-[24px] font-mono font-bold">
                        {Math.round(track.volume * 100)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile/Tablet: Vertical Layout (unverändert für jetzt) */}
                <div className="xl:hidden flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-2 md:mb-4">
                  {/* Sample Navigation - Mobile Optimized */}
                  <div className="flex-1 flex justify-center items-center order-1 md:order-none">
                    <div className="flex items-center gap-1 md:gap-2 mx-auto">
                      <div className="bg-black/50 border-2 border-muted rounded px-3 py-2 font-mono text-center min-w-[140px] md:min-w-[200px]">
                        <div className="text-primary font-bold text-sm md:text-base truncate leading-tight">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentSample = samples.find(s => s.id === track.selectedSampleId);
                            return currentSample?.name || 'No Sample';
                          })()}
                        </div>
                        <div className="text-sm md:text-base text-muted-foreground">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                            return `${currentIndex + 1}/${samples.length}`;
                          })()}
                        </div>
                      </div>
                      
                      {/* Sample Navigation - Mobile Friendly */}
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => cycleSample(track.id, -1)}
                          className="w-5 h-4 md:w-6 md:h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Previous Sample"
                        >
                          <span className="text-xs">▲</span>
                        </button>
                        <button 
                          onClick={() => cycleSample(track.id, 1)}
                          className="w-5 h-4 md:w-6 md:h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Next Sample"
                        >
                          <span className="text-xs">▼</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Volume Control - Mobile/Tablet */}
                  <div className="flex items-center gap-2 justify-end flex-shrink-0 order-2 md:order-none">
                    <AnimatedKnob
                      value={track.volume * 100}
                      size={50}
                      type="slider"
                      onValueChange={(percentage) => {
                        updateVolume(track.id, percentage);
                      }}
                      onClick={() => {
                        // Fallback: Cycle through volume levels: 0%, 30%, 50%, 70%, 100%
                        const volumeLevels = [0.0, 0.3, 0.5, 0.7, 1.0];
                        const currentIndex = volumeLevels.findIndex(v => Math.abs(v - track.volume) < 0.1);
                        const nextVolume = volumeLevels[(currentIndex + 1) % volumeLevels.length];
                        updateVolume(track.id, nextVolume * 100);
                      }}
                      ariaLabel={`Volume: ${Math.round(track.volume * 100)}%`}
                      className="w-48 h-11 md:w-56 md:h-13"
                    />
                    <div className="text-sm md:text-base text-muted-foreground text-center min-w-[24px] font-mono font-bold">
                      {Math.round(track.volume * 100)}
                    </div>
                  </div>
                </div>

                {/* GROOVE INTERFACE - Sichtbar auf Desktop wie im Photoshop Design */}
                <div className="hidden md:block mb-2">
                  {/* Desktop: 1 Reihe (16 Groove Dots) - Korrekt über Pads positioniert */}
                  <div className="relative flex justify-center">
                    <div className="flex gap-1 md:gap-1.5 justify-center">
                      {(track.groove || createDefaultGroove()).map((grooveDot, stepIndex) => {
                        return (
                          <div key={stepIndex} className="relative w-12 h-4 md:w-16 md:h-4 flex items-center justify-center">
                            {/* Groove-Track (visible drag area) */}
                            <div className={`
                              absolute inset-0 rounded transition-all duration-200
                              ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                ? 'bg-primary/20 border border-primary/50'
                                : 'hover:bg-primary/10'
                              }
                            `} />
                            
                            {/* Interactive Groove-Dot - DRAGGABLE */}
                            <div 
                              className={`
                                w-2 h-2 rounded-full transition-all duration-200 cursor-grab hover:scale-125 z-10
                                ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                  ? 'cursor-grabbing scale-150 shadow-lg'
                                  : ''
                                }
                                ${grooveDot.offsetPercent === 0 
                                  ? 'bg-gray-400 hover:bg-gray-300' // Straight = grau
                                  : grooveDot.offsetPercent < 0 
                                    ? 'bg-red-400 hover:bg-red-300' // Rushed = rot
                                    : 'bg-blue-400 hover:bg-blue-300' // Laid-back = blau
                                }
                              `}
                              style={{
                                transform: `translateX(${grooveDot.offsetPercent * 0.2}px)` // ±12px max movement for larger pads
                              }}
                              onMouseDown={(e) => handleGrooveDragStart(e, track.id, stepIndex)}
                              onDoubleClick={() => handleGrooveDoubleClick(track.id, stepIndex)}
                              onMouseMove={handleGrooveDragMove}
                              title={`Step ${stepIndex + 1}: ${
                                grooveDot.offsetPercent === 0 ? 'Straight (Drag to adjust groove)' :
                                grooveDot.offsetPercent < 0 ? `Rushed ${Math.abs(grooveDot.offsetPercent).toFixed(1)}%` :
                                `Laid-back ${grooveDot.offsetPercent.toFixed(1)}%`
                              }`}
                            />
                            
                            {/* Groove Scale - Visual Reference Lines */}
                            <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-30" />
                            <div className="absolute left-0 top-1/2 w-px h-1 bg-red-300 opacity-50" title="Max Rushed" />
                            <div className="absolute right-0 top-1/2 w-px h-1 bg-blue-300 opacity-50" title="Max Laid-back" />
                            
                            {/* Real-time Offset Display (when dragging) - 25px über Groove Dot */}
                            {isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex && (
                              <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap" style={{ top: '-25px' }}>
                                {grooveDot.offsetPercent.toFixed(1)}% {grooveDot.offsetPercent === 0 ? 'Straight' : grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* ALIGNMENT FIX: Delete Button Spacer für Groove Dots - Nicht sichtbar aber für Layout */}
                    <div className="absolute right-0 top-0 w-8 md:w-10 ml-4 opacity-0" /> {/* Invisible Spacer */}
                  </div>
                  
                  {/* Tablet: 2 Reihen (8+8 Groove Dots) - Gleiche Breite wie Pads */}
                  <div className="xl:hidden flex flex-col gap-1">
                    {/* Groove Reihe 1: Steps 1-8 */}
                    <div className="flex gap-1 md:gap-1.5 justify-center">
                      {(track.groove || createDefaultGroove()).slice(0, 8).map((grooveDot, localIndex) => {
                        const stepIndex = localIndex;
                        return (
                          <div key={stepIndex} className="relative w-10 h-10 sm:w-12 sm:h-4 md:w-16 md:h-4 flex items-center justify-center">
                            <div className={`
                              absolute inset-0 rounded transition-all duration-200
                              ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                ? 'bg-primary/20 border border-primary/50'
                                : 'hover:bg-primary/10'
                              }
                            `} />
                            
                            <div 
                              className={`
                                w-2 h-2 rounded-full transition-all duration-200 cursor-grab hover:scale-125 z-10
                                ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                  ? 'cursor-grabbing scale-150 shadow-lg'
                                  : ''
                                }
                                ${grooveDot.offsetPercent === 0 
                                  ? 'bg-gray-400 hover:bg-gray-300'
                                  : grooveDot.offsetPercent < 0 
                                    ? 'bg-red-400 hover:bg-red-300'
                                    : 'bg-blue-400 hover:bg-blue-300'
                                }
                              `}
                              style={{
                                transform: `translateX(${grooveDot.offsetPercent * 0.2}px)`
                              }}
                              onMouseDown={(e) => handleGrooveDragStart(e, track.id, stepIndex)}
                              onDoubleClick={() => handleGrooveDoubleClick(track.id, stepIndex)}
                              title={`Step ${stepIndex + 1}: ${
                                grooveDot.offsetPercent === 0 ? 'Straight (Drag to adjust groove)' :
                                grooveDot.offsetPercent < 0 ? `Rushed ${Math.abs(grooveDot.offsetPercent).toFixed(1)}%` :
                                `Laid-back ${grooveDot.offsetPercent.toFixed(1)}%`
                              }`}
                            />
                            
                            <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-30" />
                            <div className="absolute left-0 top-1/2 w-px h-1 bg-red-300 opacity-50" />
                            <div className="absolute right-0 top-1/2 w-px h-1 bg-blue-300 opacity-50" />
                            
                            {isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex && (
                              <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap" style={{ top: '-25px' }}>
                                {grooveDot.offsetPercent.toFixed(1)}% {grooveDot.offsetPercent === 0 ? 'Straight' : grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* ALIGNMENT FIX: Delete Button Spacer für Groove Dots Reihe 1 */}
                      <div className="w-10 sm:w-12 md:w-16 ml-2" /> {/* Gleiche Breite wie Delete Button */}
                    </div>
                    
                    {/* Groove Reihe 2: Steps 9-16 + Delete Button Spacer */}
                    <div className="flex gap-1 md:gap-1.5 justify-center">
                      {(track.groove || createDefaultGroove()).slice(8, 16).map((grooveDot, localIndex) => {
                        const stepIndex = localIndex + 8;
                        return (
                          <div key={stepIndex} className="relative w-10 h-10 sm:w-12 sm:h-4 md:w-16 md:h-4 flex items-center justify-center">
                            <div className={`
                              absolute inset-0 rounded transition-all duration-200
                              ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                ? 'bg-primary/20 border border-primary/50'
                                : 'hover:bg-primary/10'
                              }
                            `} />
                            
                            <div 
                              className={`
                                w-2 h-2 rounded-full transition-all duration-200 cursor-grab hover:scale-125 z-10
                                ${isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex
                                  ? 'cursor-grabbing scale-150 shadow-lg'
                                  : ''
                                }
                                ${grooveDot.offsetPercent === 0 
                                  ? 'bg-gray-400 hover:bg-gray-300'
                                  : grooveDot.offsetPercent < 0 
                                    ? 'bg-red-400 hover:bg-red-300'
                                    : 'bg-blue-400 hover:bg-blue-300'
                                }
                              `}
                              style={{
                                transform: `translateX(${grooveDot.offsetPercent * 0.2}px)`
                              }}
                              onMouseDown={(e) => handleGrooveDragStart(e, track.id, stepIndex)}
                              onDoubleClick={() => handleGrooveDoubleClick(track.id, stepIndex)}
                              title={`Step ${stepIndex + 1}: ${
                                grooveDot.offsetPercent === 0 ? 'Straight (Drag to adjust groove)' :
                                grooveDot.offsetPercent < 0 ? `Rushed ${Math.abs(grooveDot.offsetPercent).toFixed(1)}%` :
                                `Laid-back ${grooveDot.offsetPercent.toFixed(1)}%`
                              }`}
                            />
                            
                            <div className="absolute inset-x-0 top-1/2 h-px bg-border opacity-30" />
                            <div className="absolute left-0 top-1/2 w-px h-1 bg-red-300 opacity-50" />
                            <div className="absolute right-0 top-1/2 w-px h-1 bg-blue-300 opacity-50" />
                            
                            {isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex && (
                              <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap" style={{ top: '-25px' }}>
                                {grooveDot.offsetPercent.toFixed(1)}% {grooveDot.offsetPercent === 0 ? 'Straight' : grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* ALIGNMENT FIX: Delete Button Spacer für Groove Dots Reihe 2 */}
                      <div className="w-10 sm:w-12 md:w-16 ml-2" /> {/* Gleiche Breite wie Delete Button */}
                    </div>
                  </div>
                </div>

                {/* 16 Drum Pads - Desktop: 1 Zeile, Tablet/Mobile: 2 Zeilen */}
                <div>
                  {/* Desktop: 1 Zeile (alle 16 Pads zentriert) + Delete Button rechts daneben */}
                  <div className="hidden xl:block">
                    <div className="relative flex justify-center">
                      {/* 16 Pads Block - Visuell zentriert (ohne Delete Button Einfluss) */}
                      <div className="flex gap-1 md:gap-1.5 justify-center">
                        {track.steps.map((active, stepIndex) => {
                          return (
                            <div key={stepIndex} className="flex flex-col items-center">
                              <button
                                onClick={() => {
                                  setSelectedTrackIndex(trackIndex);
                                  toggleStep(track.id, stepIndex);
                                }}
                                onDoubleClick={() => cycleSample(track.id, 1)}
                                title={`Step ${stepIndex + 1} - Single click: toggle, Double click: change sample`}
                                className={`
                                  relative w-12 h-12 md:w-16 md:h-16 transition-all duration-200 transform hover:scale-105
                                `}
                                style={{
                                  backgroundImage: `url(/ui-elements/pads/${active ? 'pad_on.png' : 'pad_off.png'})`,
                                  backgroundSize: 'contain',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'center',
                                  // Komplett clean - kein Glow, keine Borders
                                  border: 'none',
                                  backgroundColor: 'transparent'
                                }}
                              >
                                <span className={`
                                  absolute inset-0 flex items-center justify-center text-xs md:text-sm font-mono font-bold
                                  ${active ? 'text-black' : 'text-muted-foreground'}
                                `}>
                                  {stepIndex + 1}
                                </span>
                              </button>
                              {/* LED Step Indicator - GELBES LAUFLICHT RESTORED */}
                              <div className={`
                                w-10 h-0.5 md:w-14 md:h-1 rounded-b-sm transition-all duration-100
                                ${stepIndex === currentStep 
                                  ? 'bg-yellow-500 shadow-md shadow-yellow-500/50' 
                                  : 'bg-gray-700'
                                }
                              `} />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Clear Pattern Button - Klein aber unten aligned */}
                      <div className="absolute right-0 flex flex-col items-center gap-1 ml-4" style={{ bottom: '10px' }}>
                        <Button
                          onClick={() => clearTrackPattern(track.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 md:h-10 md:w-10 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          title={`Clear all steps`}
                        >
                          <Trash2 className="w-2 h-2 md:w-3 md:h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tablet/Mobile: 2 Reihen Pads zentriert + Delete Button rechts daneben */}
                  <div className="xl:hidden">
                    <div className="relative flex justify-center">
                      {/* 16 Pads Block - 2 Reihen visuell zentriert (ohne Delete Button Einfluss) */}
                      <div className="flex flex-col gap-2 md:gap-3">
                        {/* Reihe 1: Steps 1-8 */}
                        <div className="flex gap-1 md:gap-1.5 justify-center">
                          {track.steps.slice(0, 8).map((active, localIndex) => {
                            const stepIndex = localIndex;
                            return (
                              <div key={stepIndex} className="flex flex-col items-center">
                                <button
                                  onClick={() => {
                                  setSelectedTrackIndex(trackIndex);
                                  toggleStep(track.id, stepIndex);
                                }}
                                  onDoubleClick={() => cycleSample(track.id, 1)}
                                  title={`Step ${stepIndex + 1} - Single click: toggle, Double click: change sample`}
                                  className={`
                                    relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 transition-all duration-200 transform hover:scale-105
                                  `}
                                  style={{
                                    backgroundImage: `url(/ui-elements/pads/${active ? 'pad_on.png' : 'pad_off.png'})`,
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    // Komplett clean - kein Glow, keine Borders
                                    border: 'none',
                                    backgroundColor: 'transparent'
                                  }}
                                >
                                  <span className={`
                                    absolute inset-0 flex items-center justify-center text-xs md:text-sm font-mono font-bold
                                    ${active ? 'text-black' : 'text-muted-foreground'}
                                  `}>
                                    {stepIndex + 1}
                                  </span>
                                </button>
                                {/* LED Step Indicator - GELBES LAUFLICHT RESTORED */}
                                <div className={`
                                  w-8 h-0.5 sm:w-10 sm:h-0.5 md:w-14 md:h-1 rounded-b-sm transition-all duration-100
                                  ${stepIndex === currentStep 
                                    ? 'bg-yellow-500 shadow-md shadow-yellow-500/50' 
                                    : 'bg-gray-700'
                                  }
                                `} />
                              </div>
                            );
                          })}
                        </div>

                        {/* Reihe 2: Steps 9-16 */}
                        <div className="flex gap-1 md:gap-1.5 justify-center">
                          {track.steps.slice(8, 16).map((active, localIndex) => {
                            const stepIndex = localIndex + 8;
                            return (
                              <div key={stepIndex} className="flex flex-col items-center">
                                <button
                                  onClick={() => {
                                  setSelectedTrackIndex(trackIndex);
                                  toggleStep(track.id, stepIndex);
                                }}
                                  onDoubleClick={() => cycleSample(track.id, 1)}
                                  title={`Step ${stepIndex + 1} - Single click: toggle, Double click: change sample`}
                                  className={`
                                    relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 transition-all duration-200 transform hover:scale-105
                                  `}
                                  style={{
                                    backgroundImage: `url(/ui-elements/pads/${active ? 'pad_on.png' : 'pad_off.png'})`,
                                    backgroundSize: 'contain',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'center',
                                    // Komplett clean - kein Glow, keine Borders
                                    border: 'none',
                                    backgroundColor: 'transparent'
                                  }}
                                >
                                  <span className={`
                                    absolute inset-0 flex items-center justify-center text-xs md:text-sm font-mono font-bold
                                    ${active ? 'text-black' : 'text-muted-foreground'}
                                  `}>
                                    {stepIndex + 1}
                                  </span>
                                </button>
                                {/* LED Step Indicator - GELBES LAUFLICHT RESTORED */}
                                <div className={`
                                  w-8 h-0.5 sm:w-10 sm:h-0.5 md:w-14 md:h-1 rounded-b-sm transition-all duration-100
                                  ${stepIndex === currentStep 
                                    ? 'bg-yellow-500 shadow-md shadow-yellow-500/50' 
                                    : 'bg-gray-700'
                                  }
                                `} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Clear Pattern Button - Klein aber unten aligned */}
                      <div className="absolute right-0 flex flex-col items-center gap-1 ml-4" style={{ bottom: '8px' }}>
                        <Button
                          onClick={() => clearTrackPattern(track.id)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          title={`Clear all steps`}
                        >
                          <Trash2 className="w-2 h-2 md:w-3 md:h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

            </div>
          ))}
        </div>

        {/* Debug Info */}
        <div className="text-center text-xs text-muted-foreground">
          Tracks: {tracks.length} | Playing: {isPlaying ? 'Yes' : 'No'} | 
          Step: {currentStep + 1}/16 | BPM: {bpm}
        </div>
      </div>

    </div>
  );
}