/**
 * Professional Drum Sequencer - BULLETPROOF IMPLEMENTATION
 * ZERO SYNTHESIS - ONLY REAL SAMPLES
 * Professional timing and dual-state architecture
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Music, Volume2, Package, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ProfessionalAudioEngine, TrackPattern } from '@/audio/AudioEngine';
import { SampleManager, SamplePack, SampleInfo } from '@/audio/SampleManager';

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

    // Stop playback if running
    if (isPlaying) {
      audioEngineRef.current.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    }

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
          const existingTrack = tracks[index] || tracks[0]; // Fallback to first track if not enough
          
          return {
            ...newPattern, // New pack structure (id, name, samples)
            steps: existingTrack ? [...existingTrack.steps] : new Array(16).fill(false), // PRESERVE pattern
            volume: existingTrack ? existingTrack.volume : 0.7, // PRESERVE volume
            groove: existingTrack ? [...existingTrack.groove] : createDefaultGroove(), // PRESERVE groove
            muted: existingTrack ? existingTrack.muted : false // PRESERVE mute state
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
   * Load Groove Template - Apply pattern and BPM from template
   */
  const loadGrooveTemplate = useCallback((templateId: string) => {
    if (!templateId || templateId === 'none') {
      setSelectedGrooveTemplate('');
      return;
    }
    
    // Use editor version if available (for curation), otherwise use original
    const template = isTemplateEditorMode ? getGrooveTemplateForEditor(templateId) : getGrooveTemplate(templateId);
    if (!template) {
      console.error(`❌ Groove template not found: ${templateId}`);
      setSelectedGrooveTemplate('');
      return;
    }
    
    console.log(`🎵 Loading groove template: ${template.name} (${template.bpm} BPM)`);
    
    // Set the selected template for UI display
    setSelectedGrooveTemplate(templateId);
    
    // Set as currently editing template (for save functionality)
    if (isTemplateEditorMode) {
      setCurrentEditingTemplate(templateId);
    }
    
    // Update BPM first
    updateBpm(template.bpm);
    
    // Apply pattern and sample assignments to matching tracks
    setTracks(prevTracks => {
      return prevTracks.map(track => {
        // Find matching pattern in template (by track type)
        const trackType = track.name.toLowerCase().replace(/\s+/g, '');
        let patternSteps = template.trackPatterns[trackType];
        let assignedSample = template.sampleAssignments?.[trackType];
        let assignedVolume = template.volumeLevels?.[trackType];
        
        // Fallback matching for common track names
        if (!patternSteps) {
          if (trackType.includes('kick') || trackType.includes('bd')) {
            patternSteps = template.trackPatterns.kick;
            assignedSample = template.sampleAssignments?.kick;
            assignedVolume = template.volumeLevels?.kick;
          } else if (trackType.includes('snare') || trackType.includes('sd')) {
            patternSteps = template.trackPatterns.snare;
            assignedSample = template.sampleAssignments?.snare;
            assignedVolume = template.volumeLevels?.snare;
          } else if (trackType.includes('hihat') || trackType.includes('hh') || trackType.includes('hat')) {
            patternSteps = template.trackPatterns.hihat;
            assignedSample = template.sampleAssignments?.hihat;
            assignedVolume = template.volumeLevels?.hihat;
          }
        }
        
        // Apply pattern and sample assignment if found
        if (patternSteps && patternSteps.length === 16) {
          console.log(`🎯 Applying pattern to track: ${track.name}`);
          
          let updatedTrack = {
            ...track,
            steps: [...patternSteps] // Deep copy
          };
          
          // Apply sample assignment if specified and available
          if (assignedSample && trackSamples[track.id]) {
            const availableSample = trackSamples[track.id].find(s => s.id === assignedSample);
            if (availableSample) {
              updatedTrack.selectedSampleId = assignedSample;
              console.log(`🎼 Applied sample assignment: ${track.name} -> ${availableSample.name}`);
            }
          }
          
          // Apply volume level if specified
          if (assignedVolume !== undefined && assignedVolume >= 0 && assignedVolume <= 1) {
            updatedTrack.volume = assignedVolume;
            console.log(`🔊 Applied volume level: ${track.name} -> ${(assignedVolume * 100).toFixed(0)}%`);
          }
          
          return updatedTrack;
        }
        
        return track;
      });
    });
    
    // Sync with audio engine
    setTimeout(() => {
      const updatedTracks = tracks.map(track => {
        const trackType = track.name.toLowerCase().replace(/\s+/g, '');
        let patternSteps = template.trackPatterns[trackType];
        
        if (!patternSteps) {
          if (trackType.includes('kick') || trackType.includes('bd')) {
            patternSteps = template.trackPatterns.kick;
          } else if (trackType.includes('snare') || trackType.includes('sd')) {
            patternSteps = template.trackPatterns.snare;
          } else if (trackType.includes('hihat') || trackType.includes('hh') || trackType.includes('hat')) {
            patternSteps = template.trackPatterns.hihat;
          }
        }
        
        return {
          ...track,
          steps: patternSteps && patternSteps.length === 16 ? [...patternSteps] : track.steps
        };
      });
      
      // Initialize audio engine with new patterns
      const audioTracks: TrackPattern[] = updatedTracks.map(track => ({
        id: track.id,
        name: track.name,
        steps: [...track.steps],
        volume: track.volume,
        selectedSampleId: track.selectedSampleId,
        muted: track.muted,
        groove: track.groove
      }));
      
      audioEngineRef.current.initializeTracks(audioTracks);
    }, 50);
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log(`✅ Groove template applied: ${template.name}`);
  }, [tracks, updateBpm, isTemplateEditorMode, trackSamples]);

  /**
   * Save current pattern and sample assignments to template (EDITOR MODE ONLY)
   */
  const saveCurrentTemplate = useCallback(() => {
    if (!currentEditingTemplate || !isTemplateEditorMode) {
      console.warn('⚠️ No template selected for editing or not in editor mode');
      return;
    }

    // Extract current patterns, sample assignments, and volume levels
    const patterns: { [trackType: string]: boolean[] } = {};
    const sampleAssignments: { [trackType: string]: string } = {};
    const volumeLevels: { [trackType: string]: number } = {};

    tracks.forEach(track => {
      const trackType = track.name.toLowerCase().replace(/\s+/g, '');
      let normalizedType = trackType;

      // Normalize track types to match template structure
      if (trackType.includes('kick') || trackType.includes('bd')) {
        normalizedType = 'kick';
      } else if (trackType.includes('snare') || trackType.includes('sd')) {
        normalizedType = 'snare';
      } else if (trackType.includes('hihat') || trackType.includes('hh') || trackType.includes('hat')) {
        normalizedType = 'hihat';
      }

      patterns[normalizedType] = [...track.steps];
      sampleAssignments[normalizedType] = track.selectedSampleId;
      volumeLevels[normalizedType] = track.volume;
    });

    // Update template in memory with volume levels
    updateGrooveTemplate(currentEditingTemplate, patterns, sampleAssignments, volumeLevels, bpm);
    
    console.log(`💾 Template saved: ${currentEditingTemplate} (with volume levels)`);
    alert(`✅ Template "${currentEditingTemplate}" saved with current pattern, sample assignments, and volume levels!`);
  }, [currentEditingTemplate, isTemplateEditorMode, tracks, bpm]);

  /**
   * Start template renaming process
   */
  const startTemplateRename = useCallback(() => {
    if (!currentEditingTemplate) return;
    
    const currentTemplate = getGrooveTemplateForEditor(currentEditingTemplate);
    if (currentTemplate) {
      setTemplateNewName(currentTemplate.name);
      setTemplateNewDescription(currentTemplate.description);
      setIsRenamingTemplate(true);
    }
  }, [currentEditingTemplate]);

  /**
   * Save template rename
   */
  const saveTemplateRename = useCallback(() => {
    if (!currentEditingTemplate || !templateNewName.trim()) {
      alert('❌ Template name cannot be empty');
      return;
    }

    updateTemplateName(currentEditingTemplate, templateNewName.trim(), templateNewDescription.trim());
    setIsRenamingTemplate(false);
    console.log(`✏️ Template renamed: ${templateNewName}`);
    alert(`✅ Template renamed to "${templateNewName}"!`);
  }, [currentEditingTemplate, templateNewName, templateNewDescription]);

  /**
   * Cancel template rename
   */
  const cancelTemplateRename = useCallback(() => {
    setIsRenamingTemplate(false);
    setTemplateNewName('');
    setTemplateNewDescription('');
  }, []);

  /**
   * Export all modified templates (FINAL SAVE)
   */
  const exportFinalTemplates = useCallback(() => {
    if (!isTemplateEditorMode) {
      console.warn('⚠️ Not in template editor mode');
      return;
    }

    const exportedCode = exportModifiedTemplates();
    
    // Show export code in console and download as file
    console.log('📝 FINAL TEMPLATES CODE:');
    console.log(exportedCode);
    
    // Download as file
    const blob = new Blob([exportedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'UpdatedGrooveTemplates.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ All modified templates exported! Check console and downloads.');
  }, [isTemplateEditorMode]);

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            SoundAngeles Professional Sequencer
          </h1>
          <p className="text-muted-foreground">
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

            {/* Cover Image - Double Size */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-lg border-2 border-border overflow-hidden bg-muted shadow-xl">
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

        {/* New Redesigned Control Layout - Fixed Alignment */}
        <div className="flex items-center w-full px-8">
          {/* Left Group: Pattern Banks + COPY/CLEAR Controls */}
          <div className="flex items-center gap-4">
            {/* Pattern Banks A-D */}
            <div className="flex gap-1">
              {patternBanks.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => loadPatternFromBank(bank.id)}
                  className={`
                    w-12 h-12 rounded border-2 font-bold text-lg transition-all duration-200
                    ${currentBankId === bank.id
                      ? 'bg-primary border-primary text-primary-foreground shadow-lg'
                      : 'bg-card border-border text-card-foreground hover:border-primary hover:bg-accent'
                    }
                  `}
                  title={`Load Pattern ${bank.id}`}
                >
                  {bank.id}
                </button>
              ))}
            </div>

            {/* COPY and CLEAR Controls */}
            <div className="flex items-center gap-2">
              {/* COPY Button (first) */}
              <Select onValueChange={(toBankId) => copyPatternToBank(currentBankId, toBankId)}>
                <SelectTrigger className="w-24 h-8 text-xs gap-1">
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
                <SelectTrigger className="w-24 h-8 text-xs gap-1">
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
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right Group: Template Editor + Groove Templates + BPM Display + Play Button */}
          <div className="flex items-center gap-4">
            {/* Template Editor Controls (TEMPORARY - only during curation) */}
            {isTemplateEditorMode && (
              <div className="flex items-center gap-2 border border-yellow-500 rounded px-3 py-2 bg-yellow-100 dark:bg-yellow-900">
                <div className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">EDITOR MODE</div>
                <Button
                  onClick={saveCurrentTemplate}
                  disabled={!currentEditingTemplate}
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm font-bold bg-green-200 hover:bg-green-300 border-green-500 text-green-900 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700 shadow-md"
                >
                  💾 Save Template
                </Button>
                <Button
                  onClick={startTemplateRename}
                  disabled={!currentEditingTemplate}
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm font-bold bg-purple-200 hover:bg-purple-300 border-purple-500 text-purple-900 dark:bg-purple-800 dark:text-purple-100 dark:hover:bg-purple-700 shadow-md"
                >
                  ✏️ Rename
                </Button>
                <Button
                  onClick={exportFinalTemplates}
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm font-bold bg-blue-200 hover:bg-blue-300 border-blue-500 text-blue-900 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700 shadow-md"
                >
                  📁 Export All
                </Button>
              </div>
            )}
            
            {/* Groove Templates Dropdown */}
            <div className="flex items-center gap-2">
              <Select value={selectedGrooveTemplate} onValueChange={loadGrooveTemplate}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue placeholder="Groove">
                    {selectedGrooveTemplate ? 
                      GROOVE_TEMPLATES.find(t => t.id === selectedGrooveTemplate)?.name || "Groove" 
                      : "Groove"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Groove</SelectItem>
                  {GROOVE_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.bpm} BPM • {template.origin}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* BPM Display (Instrument Style) */}
            <div className="flex items-center gap-2">
              <div className="bg-black border border-border rounded px-3 py-2 min-w-[80px] text-center">
                <div className="text-white font-mono text-lg font-bold">{bpm}</div>
                <div className="text-xs text-muted-foreground">BPM</div>
              </div>
              <div className="flex flex-col gap-1">
                <Button 
                  onClick={() => updateBpm(Math.min(200, bpm + 1))}
                  size="sm"
                  variant="outline"
                  className="h-6 w-8 p-0 text-xs"
                >
                  ▲
                </Button>
                <Button 
                  onClick={() => updateBpm(Math.max(60, bpm - 1))}
                  size="sm"
                  variant="outline"
                  className="h-6 w-8 p-0 text-xs"
                >
                  ▼
                </Button>
              </div>
            </div>

            {/* Large Play/Stop Button */}
            <div className="flex items-center">
              {!isPlaying ? (
                <Button onClick={handlePlay} className="bg-green-600 hover:bg-green-700 w-24 h-16 text-xl">
                  <Play className="w-10 h-10" />
                </Button>
              ) : (
                <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 w-24 h-16 text-xl">
                  <Square className="w-10 h-10" />
                </Button>
              )}
            </div>
          </div>
        </div>


        {/* Track Grid - Responsive Layout */}
        <div className="space-y-6">
          {tracks.map((track, trackIndex) => (
            <div key={track.id} className="bg-card rounded-lg p-4 border border-border">
              
              {/* Desktop Layout - 2 Zeilen */}
              <div className="hidden lg:block mb-4">
                {/* Zeile 1: Track Name links, Sample Display zentriert, Volume Slider kompakt rechts */}
                <div className="flex items-center gap-3 mb-4">
                  {/* Track Info - Removed redundant instrument name */}
                  <div className="w-28 flex-shrink-0">
                    <button
                      onClick={() => triggerSample(track.id)}
                      className="text-left hover:bg-accent rounded p-2 transition-colors group cursor-pointer w-full"
                    >
                      {/* Removed redundant instrument name - already shown in sample display */}
                    </button>
                  </div>

                  {/* Sample Navigation - absolut zentriert */}
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-black/50 border-2 border-muted rounded px-2 py-1 font-mono text-center min-w-[140px]">
                        <div className="text-primary font-bold text-xs truncate leading-tight">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentSample = samples.find(s => s.id === track.selectedSampleId);
                            return currentSample?.name || 'No Sample';
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const samples = trackSamples[track.id] || [];
                            const currentIndex = samples.findIndex(s => s.id === track.selectedSampleId);
                            return `${currentIndex + 1}/${samples.length}`;
                          })()}
                        </div>
                      </div>
                      
                      {/* Vertical Up/Down Controls - Synthesizer Logic */}
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => cycleSample(track.id, -1)}
                          className="w-6 h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Previous Sample (Synthesizer Logic)"
                        >
                          <span className="text-xs">▲</span>
                        </button>
                        <button 
                          onClick={() => cycleSample(track.id, 1)}
                          className="w-6 h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                          disabled={(trackSamples[track.id] || []).length <= 1}
                          title="Next Sample (Synthesizer Logic)"
                        >
                          <span className="text-xs">▼</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clear Button + Volume Control - kompakt wie BPM Display (rechts) */}
                  <div className="flex items-center gap-2 w-40 flex-shrink-0">
                    {/* Clear Pattern Button */}
                    <Button
                      onClick={() => clearTrackPattern(track.id)}
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title={`Clear all steps for ${track.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    
                    <Volume2 className="w-4 h-4" />
                    <Slider
                      value={[track.volume * 100]}
                      onValueChange={([value]) => updateVolume(track.id, value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* REVOLUTIONARY VISUAL GROOVE INTERFACE - Aligned with 4-Group Structure */}
                <div className="flex gap-6 justify-center mb-2">
                  {/* Groove Gruppe 1: Steps 1-4 */}
                  <div className="flex gap-1.5">
                    {(track.groove || createDefaultGroove()).slice(0, 4).map((grooveDot, localIndex) => {
                      const stepIndex = localIndex;
                      return (
                        <div key={stepIndex} className="relative w-16 h-4 flex items-center justify-center">
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
                          
                          {/* Real-time Offset Display (when dragging) */}
                          {isDragging && dragTarget?.trackId === track.id && dragTarget?.stepIndex === stepIndex && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-20">
                              {grooveDot.offsetPercent.toFixed(1)}%
                              <div className="text-xs text-gray-300">
                                {grooveDot.offsetPercent === 0 ? 'Straight' :
                                 grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Groove Gruppe 2: Steps 5-8 */}
                  <div className="flex gap-1.5">
                    {(track.groove || createDefaultGroove()).slice(4, 8).map((grooveDot, localIndex) => {
                      const stepIndex = localIndex + 4;
                      return (
                        <div key={stepIndex} className="relative w-16 h-4 flex items-center justify-center">
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
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-20">
                              {grooveDot.offsetPercent.toFixed(1)}%
                              <div className="text-xs text-gray-300">
                                {grooveDot.offsetPercent === 0 ? 'Straight' :
                                 grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Groove Gruppe 3: Steps 9-12 */}
                  <div className="flex gap-1.5">
                    {(track.groove || createDefaultGroove()).slice(8, 12).map((grooveDot, localIndex) => {
                      const stepIndex = localIndex + 8;
                      return (
                        <div key={stepIndex} className="relative w-16 h-4 flex items-center justify-center">
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
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-20">
                              {grooveDot.offsetPercent.toFixed(1)}%
                              <div className="text-xs text-gray-300">
                                {grooveDot.offsetPercent === 0 ? 'Straight' :
                                 grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Groove Gruppe 4: Steps 13-16 */}
                  <div className="flex gap-1.5">
                    {(track.groove || createDefaultGroove()).slice(12, 16).map((grooveDot, localIndex) => {
                      const stepIndex = localIndex + 12;
                      return (
                        <div key={stepIndex} className="relative w-16 h-4 flex items-center justify-center">
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
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-20">
                              {grooveDot.offsetPercent.toFixed(1)}%
                              <div className="text-xs text-gray-300">
                                {grooveDot.offsetPercent === 0 ? 'Straight' :
                                 grooveDot.offsetPercent < 0 ? 'Rushed' : 'Laid-back'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 16 Drum Pads in 4er-Gruppen - Hardware-Style Takt-Struktur */}
                <div className="flex gap-6 justify-center">
                  {/* Gruppe 1: Steps 1-4 */}
                  <div className="flex gap-1.5">
                    {track.steps.slice(0, 4).map((active, localIndex) => {
                      const stepIndex = localIndex;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`
                            relative w-16 h-16 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${active 
                              ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-400 shadow-lg shadow-green-400/30' 
                              : 'bg-background border-border hover:border-muted-foreground/50'
                            }
                            ${stepIndex === currentStep ? 'ring-2 ring-primary' : ''}
                          `}
                        >
                          <span className={`
                            absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                            ${active ? 'text-black' : 'text-muted-foreground'}
                          `}>
                            {stepIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Gruppe 2: Steps 5-8 */}
                  <div className="flex gap-1.5">
                    {track.steps.slice(4, 8).map((active, localIndex) => {
                      const stepIndex = localIndex + 4;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`
                            relative w-16 h-16 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${active 
                              ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-400 shadow-lg shadow-green-400/30' 
                              : 'bg-background border-border hover:border-muted-foreground/50'
                            }
                            ${stepIndex === currentStep ? 'ring-2 ring-primary' : ''}
                          `}
                        >
                          <span className={`
                            absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                            ${active ? 'text-black' : 'text-muted-foreground'}
                          `}>
                            {stepIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Gruppe 3: Steps 9-12 */}
                  <div className="flex gap-1.5">
                    {track.steps.slice(8, 12).map((active, localIndex) => {
                      const stepIndex = localIndex + 8;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`
                            relative w-16 h-16 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${active 
                              ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-400 shadow-lg shadow-green-400/30' 
                              : 'bg-background border-border hover:border-muted-foreground/50'
                            }
                            ${stepIndex === currentStep ? 'ring-2 ring-primary' : ''}
                          `}
                        >
                          <span className={`
                            absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                            ${active ? 'text-black' : 'text-muted-foreground'}
                          `}>
                            {stepIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Gruppe 4: Steps 13-16 */}
                  <div className="flex gap-1.5">
                    {track.steps.slice(12, 16).map((active, localIndex) => {
                      const stepIndex = localIndex + 12;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleStep(track.id, stepIndex)}
                          className={`
                            relative w-16 h-16 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                            ${active 
                              ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-400 shadow-lg shadow-green-400/30' 
                              : 'bg-background border-border hover:border-muted-foreground/50'
                            }
                            ${stepIndex === currentStep ? 'ring-2 ring-primary' : ''}
                          `}
                        >
                          <span className={`
                            absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                            ${active ? 'text-black' : 'text-muted-foreground'}
                          `}>
                            {stepIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="lg:hidden space-y-4">
                {/* Track Name (centered, prominent) */}
                <div className="text-center">
                  <button
                    onClick={() => triggerSample(track.id)}
                    className="hover:bg-accent rounded p-3 transition-colors group cursor-pointer"
                  >
                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                      {track.name}
                    </h3>
                  </button>
                </div>

                {/* 16 Pads in 2 rows of 8 */}
                <div className="space-y-3">
                  {/* First row (steps 1-8) */}
                  <div className="flex justify-center gap-2">
                    {track.steps.slice(0, 8).map((active, stepIndex) => (
                      <button
                        key={stepIndex}
                        onClick={() => toggleStep(track.id, stepIndex)}
                        className={`
                          relative w-12 h-12 rounded-full border-2 transition-all duration-200 transform active:scale-95
                          ${active 
                            ? `bg-gradient-to-br from-${track.color} to-${track.color}/70 border-${track.color} shadow-lg shadow-${track.color}/30` 
                            : 'bg-background border-border'
                          }
                          ${stepIndex === currentStep 
                            ? `ring-1 ring-primary ring-opacity-30` 
                            : ''
                          }
                        `}
                      >
                        <span className={`
                          absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                          ${active ? 'text-black' : 'text-muted-foreground'}
                          `}>
                          {stepIndex + 1}
                        </span>
                        
                        {active && (
                          <div className={`absolute inset-0 rounded-lg bg-green-400 opacity-10`} />
                        )}
                        
                      </button>
                    ))}
                  </div>
                  
                  {/* Second row (steps 9-16) */}
                  <div className="flex justify-center gap-2">
                    {track.steps.slice(8, 16).map((active, stepIndex) => {
                      const actualStepIndex = stepIndex + 8;
                      return (
                        <button
                          key={actualStepIndex}
                          onClick={() => toggleStep(track.id, actualStepIndex)}
                          className={`
                            relative w-12 h-12 rounded-full border-2 transition-all duration-200 transform active:scale-95
                            ${active 
                              ? `bg-gradient-to-br from-${track.color} to-${track.color}/70 border-${track.color} shadow-lg shadow-${track.color}/30` 
                              : 'bg-background border-border'
                            }
                            ${actualStepIndex === currentStep 
                              ? `ring-1 ring-primary ring-opacity-30` 
                              : ''
                            }
                            ${(actualStepIndex % 4 === 0) ? 'ring-2 ring-muted' : ''}
                          `}
                        >
                          <span className={`
                            absolute inset-0 flex items-center justify-center text-sm font-mono font-bold
                            ${active ? 'text-black' : 'text-muted-foreground'}
                            ${actualStepIndex === currentStep ? 'text-primary' : ''}
                          `}>
                            {actualStepIndex + 1}
                          </span>
                          
                          {active && (
                            <div className={`absolute inset-0 rounded-lg bg-green-400 opacity-10`} />
                          )}
                          
                          {(actualStepIndex % 4 === 0) && (
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Controls (below pads) */}
                <div className="flex items-center justify-between gap-4">
                  {/* Clear Button + Volume Control */}
                  <div className="flex items-center gap-2 flex-1">
                    {/* Clear Pattern Button */}
                    <Button
                      onClick={() => clearTrackPattern(track.id)}
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground transition-colors flex-shrink-0"
                      title={`Clear all steps for ${track.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    
                    <Volume2 className="w-4 h-4" />
                    <Slider
                      value={[track.volume * 100]}
                      onValueChange={([value]) => updateVolume(track.id, value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>

                  {/* Sample Navigation - Mobile Vertical Controls */}
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-black/50 border-2 border-muted rounded px-2 py-1 font-mono text-center">
                      <div className="text-xs text-primary font-bold truncate">
                        {(() => {
                          const samples = trackSamples[track.id] || [];
                          const currentSample = samples.find(s => s.id === track.selectedSampleId);
                          return currentSample?.name || 'No Sample';
                        })()}
                      </div>
                    </div>
                    
                    {/* Mobile Vertical Controls */}
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => cycleSample(track.id, 1)}
                        className="w-8 h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                        disabled={(trackSamples[track.id] || []).length <= 1}
                        title="Next Sample"
                      >
                        <span className="text-xs">▲</span>
                      </button>
                      <button 
                        onClick={() => cycleSample(track.id, -1)}
                        className="w-8 h-5 rounded border-2 border-border hover:border-primary transition-colors flex items-center justify-center hover:bg-accent"
                        disabled={(trackSamples[track.id] || []).length <= 1}
                        title="Previous Sample"
                      >
                        <span className="text-xs">▼</span>
                      </button>
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
          {isTemplateEditorMode && currentEditingTemplate && (
            <span className="text-yellow-600 font-medium">
              {' '} | EDITING: {currentEditingTemplate}
            </span>
          )}
        </div>
      </div>

      {/* Template Rename Modal */}
      {isRenamingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
              Template umbenennen
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Template Name
                </label>
                <Input
                  value={templateNewName}
                  onChange={(e) => setTemplateNewName(e.target.value)}
                  placeholder="z.B. Hip-Hop Classic, Trap Modern..."
                  className="w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Beschreibung
                </label>
                <Input
                  value={templateNewDescription}
                  onChange={(e) => setTemplateNewDescription(e.target.value)}
                  placeholder="z.B. Klassischer Hip-Hop Beat für Producer..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={saveTemplateRename}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ Speichern
              </Button>
              <Button
                onClick={cancelTemplateRename}
                variant="outline"
                className="flex-1"
              >
                ❌ Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}