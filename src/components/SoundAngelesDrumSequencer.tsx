/**
 * SOUNDANGELES DRUM SEQUENCER - COMPLETE PROFESSIONAL IMPLEMENTATION
 * Features: J Dilla Groove Engine, Pattern Banks (A,B,C,D), Copy Functions, Real Audio Samples, Cover Display
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCcw, Copy, Trash2, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RotaryKnob } from './RotaryKnob';
import { BlueprintOverlay, useBlueprintOverlay } from './BlueprintOverlay';
import { InstrumentWippSchalter } from './InstrumentWippSchalter';
import AddToCartButton from '@/components/AddToCartButton';
import ProgrammerCredits from '@/components/ProgrammerCredits';

// Import the real audio engine
import { ProfessionalAudioEngine, TrackPattern, GrooveDot } from '../audio/AudioEngine';

// Import styles
import '@/styles/soundangeles-sequencer.css';

interface SoundAngelesDrumSequencerProps {
  embedded?: boolean;
}

// Enhanced track pattern with groove support
interface EnhancedTrackPattern extends TrackPattern {
  groove: GrooveDot[]; // 16 Groove-Dots für jeden Step
}

// Pattern Bank structure
interface PatternBank {
  id: string;
  name: string;
  tracks: EnhancedTrackPattern[];
  bpm: number;
}

// Global quantization presets
interface QuantizationPreset {
  id: string;
  name: string;
  description: string;
}

// Function to get track ID from folder name (same as mobile version)
const getTrackIdFromFolder = (folderName: string): string => {
  // Keep the original folder name as much as possible for the ID
  // Just replace spaces and special characters with underscores to make it a valid ID
  return folderName.replace(/[\s-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
};

/**
 * GROOVE UTILITIES - J Dilla Style Programming
 */

/**
 * Create default groove for a track - all steps straight (centered)
 */
const createDefaultGroove = (): GrooveDot[] => {
  return Array(16).fill(null).map((_, index) => ({
    stepIndex: index,
    offsetPercent: 0, // Straight timing
    offsetMs: 0
  }));
};

/**
 * Apply global quantization to all tracks - UNIFIED GROOVE SYSTEM
 */
const applyGlobalQuantization = (
  tracks: EnhancedTrackPattern[], 
  preset: string,
  audioEngine: ProfessionalAudioEngine
): EnhancedTrackPattern[] => {
  console.log(`🎵 Applying global quantization: ${preset.toUpperCase()}`);
  return applyGroovePreset(tracks, preset, audioEngine);
};

/**
 * Apply groove preset to all tracks
 */
const applyGroovePreset = (
  tracks: EnhancedTrackPattern[], 
  preset: string,
  audioEngine: ProfessionalAudioEngine
): EnhancedTrackPattern[] => {
  const groovePatterns: Record<string, number[]> = {
    // STRAIGHT (0%) - Keine Verschiebung
    'straight': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // SLIGHT (~8-15%) - Minimaler Swing - Leichte Verschiebung der Off-Beats
    'slight': [0, -12, 0, -12, 0, -12, 0, -12, 0, -12, 0, -12, 0, -12, 0, -12],
    // SWING (~20-25%) - Standard Swing Feel - Klassischer Swing
    'swing': [0, -23, 0, -23, 0, -23, 0, -23, 0, -23, 0, -23, 0, -23, 0, -23]
  };
  
  const selectedGroove = groovePatterns[preset] || groovePatterns['straight'];
  
  return tracks.map(track => {
    const newGroove = selectedGroove.map((offset, index) => ({
      stepIndex: index,
      offsetPercent: offset,
      offsetMs: (offset / 100) * ((60 / 120) / 4) * 0.75 * 1000 // Calculate offset in ms
    }));
    
    // Sync to audio engine
    audioEngine.updateGroove(track.id, newGroove);
    
    return { ...track, groove: newGroove };
  });
  
  console.log(`🎵 Applied groove preset: ${preset.toUpperCase()}`);
};

export default function SoundAngelesDrumSequencer({ embedded = false }: SoundAngelesDrumSequencerProps) {
  // CORE STATE - Professional drum sequencer with real samples
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(100);
  const [masterVolume, setMasterVolume] = useState(70);
  
  const [currentInstrument, setCurrentInstrument] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [availablePacks, setAvailablePacks] = useState<any[]>([]);
  const [currentPackIndex, setCurrentPackIndex] = useState(0);
  
  // HERO SLIDER ANIMATION STATE
  const [isAutoSwiping, setIsAutoSwiping] = useState(false);
  const [hasShownAllPacks, setHasShownAllPacks] = useState(false);
  
  // SAMPLE SELECTION - Track current sample index per instrument
  const [sampleIndices, setSampleIndices] = useState<number[]>(new Array(8).fill(0));
  
  // TRACK VOLUMES - Individual volume for each instrument (0-100)
  const [trackVolumes, setTrackVolumes] = useState<number[]>(new Array(8).fill(75));
  
  // BLUEPRINT OVERLAY - For pixel-perfect development
  const blueprint = useBlueprintOverlay();
  
  // PATTERN BANK SYSTEM - A, B, C, D banks with copy functionality
  const [patternBanks, setPatternBanks] = useState<PatternBank[]>([]);
  const [currentBankId, setCurrentBankId] = useState('A');
  
  // SEQUENTIAL COPY SYSTEM - Track which copy operations are available
  const [copyProgress, setCopyProgress] = useState({
    'A-B': true,  // A→B available at start
    'B-C': false, // B→C disabled until A→B is done  
    'C-D': false  // C→D disabled until B→C is done
  });

  // Determine which banks are available for selection
  const availableBanks = useMemo(() => {
    const banks = ['A']; // A is always available
    
    // Sequential unlock: each copy unlocks the NEXT bank
    if (!copyProgress['A-B']) { // A→B is done (shows "DONE")
      banks.push('B');
      if (!copyProgress['B-C']) { // B→C is done (shows "DONE")
        banks.push('C');
        if (!copyProgress['C-D']) { // C→D is done (shows "DONE")
          banks.push('D');
        }
      }
    }
    
    console.log('🏦 Available banks:', banks, 'Copy progress:', copyProgress);
    return banks;
  }, [copyProgress]);
  
  // TRACK SYSTEM - Single row with instrument switching
  const [tracks, setTracks] = useState<EnhancedTrackPattern[]>([]);
  const [patterns, setPatterns] = useState<boolean[][]>([]);
  
  // GLOBAL QUANTIZATION SYSTEM - Applies to all instruments
  const [currentGroovePreset, setCurrentGroovePreset] = useState('straight');
  const [showGrooveControls, setShowGrooveControls] = useState(false);
  
  // Get exactly 8 instruments from pack folders - DYNAMIC from actual folder names
  const getFixedInstruments = useCallback((pack: any) => {
    if (!pack || !pack.categories) {
      // Return 8 empty slots
      return Array(8).fill(null).map((_, idx) => ({
        id: idx,
        name: '---',
        originalCategory: null,
        hasSamples: false
      }));
    }
    
    // Get actual folder names (max 8)
    const categoryKeys = Object.keys(pack.categories).slice(0, 8);
    
    // Create instruments from actual folders, pad with empty slots if < 8
    const instruments = [];
    
    for (let i = 0; i < 8; i++) {
      if (i < categoryKeys.length) {
        const categoryKey = categoryKeys[i];
        // Use REAL folder names: clean and keep SHORT
        const cleanName = categoryKey
          .replace(/^\d+[-\s]*/, '') // Remove "01-" prefix only
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces  
          .replace(/\s+(Drums?|Hat|Hats?|Percussion)\s*$/i, '') // Remove common suffixes
          .toUpperCase() // Convert to uppercase for consistent display
          .trim();

        // ✅ FIX: Map specific short names to full names for consistency
        const nameMapping: { [key: string]: string } = {
          'HI': 'HI-HAT',
          'KICK': 'KICK',
          'SNARE': 'SNARE', 
          'OPEN': 'OPEN',
          'RIDE': 'RIDE',
          'CLAP': 'CLAP',
          'PERC': 'PERC',
          'CONGA': 'CONGA'
        };
        
        const mappedName = nameMapping[cleanName] || cleanName;
        
        instruments.push({
          id: i,
          name: mappedName || `INST ${i + 1}`,  // Real folder names with consistent mapping
          originalCategory: categoryKey,
          hasSamples: true
        });
      } else {
        // Empty slot
        instruments.push({
          id: i,
          name: '---',
          originalCategory: null,
          hasSamples: false
        });
      }
    }
    
    return instruments;
  }, []);
  
  // Get current instruments based on selected pack - ALWAYS 8 SLOTS
  const currentInstruments = useMemo(() => {
    if (availablePacks.length === 0) {
      // Return 8 empty slots when no packs available
      return Array(8).fill(null).map((_, idx) => ({
        id: idx,
        name: '---',
        originalCategory: null,
        hasSamples: false
      }));
    }
    const currentPack = availablePacks[currentPackIndex];
    return getFixedInstruments(currentPack);
  }, [availablePacks, currentPackIndex, getFixedInstruments]);
  
  // Color scheme matching soundangeles.com
  const colors = {
    primary: '#DB1215',      // Deep red from soundangeles
    background: '#FFFFFF',   // White background
    surface: '#F8F8F8',      // Light gray surface
    text: '#000000',         // Black text
    textMuted: '#666666',    // Muted gray text
    border: '#E0E0E0',       // Light border
    active: '#DB1215',       // Active state red
    hover: '#FF4444',        // Hover state lighter red
  };
  
  // REFS
  const audioEngineRef = useRef<ProfessionalAudioEngine>(new ProfessionalAudioEngine());
  const visualUpdateRef = useRef<number | null>(null);

  // GLOBAL QUANTIZATION - Apply to all instruments
  const handleQuantizationChange = useCallback((preset: string) => {
    setCurrentGroovePreset(preset);
    
    if (tracks.length > 0) {
      const updatedTracks = applyGlobalQuantization(tracks, preset, audioEngineRef.current);
      setTracks(updatedTracks);
      
      // Update audio engine for all tracks
      updatedTracks.forEach(track => {
        audioEngineRef.current.updateGroove(track.id, track.groove);
      });
      
      console.log(`🌍 Global quantization applied: ${preset} to ${tracks.length} track(s)`);
    }
  }, [tracks]);
  
  // PATTERN BANK UTILITIES
  const initializePatternBanks = useCallback(() => {
    if (tracks.length === 0) return;
    
    const bankNames = ['A', 'B', 'C', 'D'];
    const defaultBanks: PatternBank[] = bankNames.map(name => ({
      id: name,
      name: `Bank ${name}`,
      tracks: tracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false),
        groove: createDefaultGroove()
      })),
      bpm: 100
    }));
    
    setPatternBanks(defaultBanks);
    console.log('🏦 Pattern banks initialized:', bankNames);
  }, [tracks]);
  
  const saveCurrentPatternToBank = useCallback(() => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === currentBankId 
        ? {
            ...bank, 
            tracks: [...tracks],
            bpm: bpm
          }
        : bank
    ));
    console.log(`💾 Pattern saved to Bank ${currentBankId}`);
  }, [tracks, bpm, currentBankId]);
  
  const loadPatternFromBank = useCallback((bankId: string) => {
    const bank = patternBanks.find(b => b.id === bankId);
    if (!bank) return;
    
    // Save current pattern before switching
    if (bankId !== currentBankId) {
      saveCurrentPatternToBank();
    }
    
    // Initialize audio engine with bank tracks
    audioEngineRef.current.initializeTracks(bank.tracks);
    
    // Load bank data
    setTracks(bank.tracks);
    setBpm(bank.bpm);
    audioEngineRef.current.setBpm(bank.bpm);
    setCurrentBankId(bankId);
    
    // patterns array is not needed anymore - we read directly from tracks
    
    console.log(`📂 Pattern loaded from Bank ${bankId}`);
  }, [patternBanks, currentBankId, saveCurrentPatternToBank]);
  
  const copyPatternToBank = useCallback((fromBankId: string, toBankId: string) => {
    console.log(`🔄 Starting copy: ${fromBankId} → ${toBankId}`);
    console.log(`📊 Current tracks:`, tracks.map(t => ({ id: t.id, steps: t.steps.filter(s => s).length })));
    
    // Get source data IMMEDIATELY (use current live tracks if copying from current bank)
    const sourceData = fromBankId === currentBankId 
      ? { 
          tracks: tracks.map(track => ({ 
            ...track, 
            steps: [...track.steps], 
            groove: [...track.groove] 
          })), 
          bpm: bpm 
        }
      : patternBanks.find(b => b.id === fromBankId);
    
    if (!sourceData) {
      console.error(`❌ Source bank ${fromBankId} not found`);
      return;
    }
    
    console.log(`📊 Source data:`, sourceData.tracks.map(t => ({ id: t.id, steps: t.steps.filter(s => s).length })));
    
    // ATOMIC UPDATE: Copy data and update progress in one batch
    setPatternBanks(prev => {
      const updatedBanks = prev.map(bank => {
        if (bank.id === toBankId) {
          // Copy to target bank
          return {
            ...bank,
            tracks: sourceData.tracks.map(track => ({ 
              ...track, 
              steps: [...track.steps], 
              groove: [...track.groove] 
            })),
            bpm: sourceData.bpm
          };
        } else if (bank.id === fromBankId && fromBankId === currentBankId) {
          // Also save current state to source bank
          return {
            ...bank,
            tracks: tracks.map(track => ({ 
              ...track, 
              steps: [...track.steps], 
              groove: [...track.groove] 
            })),
            bpm: bpm
          };
        }
        return bank;
      });
      
      console.log(`✅ Pattern banks updated`);
      return updatedBanks;
    });
    
    // Update copy progress - mark current as done, enable next
    setCopyProgress(prev => {
      const newProgress = { ...prev };
      
      if (fromBankId === 'A' && toBankId === 'B') {
        newProgress['A-B'] = false;  // Mark A→B as done (disable it)
        newProgress['B-C'] = true;   // Enable B→C
      } else if (fromBankId === 'B' && toBankId === 'C') {
        newProgress['B-C'] = false;  // Mark B→C as done (disable it)
        newProgress['C-D'] = true;   // Enable C→D
      } else if (fromBankId === 'C' && toBankId === 'D') {
        newProgress['C-D'] = false;  // Mark C→D as done (disable it)
      }
      
      console.log(`📋 Copy progress updated:`, newProgress);
      return newProgress;
    });
    
    // Immediately switch to target bank with the copied data
    const targetTracks = sourceData.tracks.map(track => ({ 
      ...track, 
      steps: [...track.steps], 
      groove: [...track.groove] 
    }));
    
    // Initialize audio engine
    audioEngineRef.current.initializeTracks(targetTracks);
    
    // Update React state
    setTracks(targetTracks);
    setBpm(sourceData.bpm);
    audioEngineRef.current.setBpm(sourceData.bpm);
    setCurrentBankId(toBankId);
    
    // patterns array is not needed anymore - we read directly from tracks
    
    console.log(`🎯 Auto-switched to Bank ${toBankId}`);
    console.log(`📊 New tracks:`, targetTracks.map(t => ({ id: t.id, steps: t.steps.filter(s => s).length })));
    console.log(`📋 Copy operation completed: ${fromBankId} → ${toBankId}`);
  }, [tracks, bpm, currentBankId, patternBanks, copyProgress]);
  
  const clearPatternInBank = useCallback((bankId: string) => {
    setPatternBanks(prev => prev.map(bank => 
      bank.id === bankId 
        ? {
            ...bank, 
            tracks: bank.tracks.map(track => ({
              ...track,
              steps: new Array(16).fill(false),
              groove: createDefaultGroove()
            }))
          }
        : bank
    ));
    
    // If clearing current bank, update current pattern too
    if (bankId === currentBankId) {
      const clearedTracks = tracks.map(track => ({
        ...track,
        steps: new Array(16).fill(false),
        groove: createDefaultGroove()
      }));
      setTracks(clearedTracks);
      audioEngineRef.current.initializeTracks(clearedTracks);
      // patterns array is not needed anymore - we read directly from tracks
    }
    
    console.log(`🗑️ Pattern cleared in Bank ${bankId}`);
  }, [tracks, currentBankId]);
  
  // INITIALIZATION
  useEffect(() => {
    const initializeSequencer = async () => {
      try {
        setIsLoading(true);
        
        // 🔄 SIMPLIFIED SAMPLE PACK LOADING - ONLY from /sample-packs-data.json
        let loadedPacks = [];
        
        try {
          console.log('📦 Loading sample data from /sample-packs-data.json...');
          
          const response = await fetch('/sample-packs-data.json');
          if (!response.ok) {
            throw new Error(`Failed to load sample data: ${response.status}`);
          }
          
          const staticData = await response.json();
          console.log('✅ Successfully loaded static sample data');
          
          // Convert static data to expected format
          for (const pack of staticData.packs) {
            const categories = {};
            const packName = pack.folderName;
            
            // Get instruments for this pack
            const instrumentFolders = staticData.instruments[packName] || [];
            
            for (const folderName of instrumentFolders) {
              const samples = staticData.samples[packName]?.[folderName] || [];
              if (samples.length > 0) {
                categories[folderName] = {
                  samples: samples.map(sample => sample.path)
                };
              }
            }
            
            loadedPacks.push({
              id: pack.id,
              name: pack.name,
              description: pack.description,
              coverImage: pack.coverImage,
              categories: categories
            });
          }
          
          console.log(`✅ Successfully loaded ${loadedPacks.length} sample packs`);
        } catch (error) {
          console.error('❌ Failed to load sample packs:', error);
          setIsLoading(false);
          return;
        }
        
        if (loadedPacks.length === 0) {
          console.error('❌ No sample packs found in data file');
          setIsLoading(false);
          return;
        }
        
        // 🔄 SAMPLE PACK DISCOVERY - Static (CDN) or Dynamic (Dev)
        let discoveredPacks = [];
        
        try {
          console.log('📦 Trying static sample data first (CDN mode)...');
          
          // Try static data first (for CDN builds)  
          const staticResponse = await fetch('/sample-packs-data.json');
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            console.log('✅ Using pre-generated static sample data');
            
            // Convert static data to expected format
            for (const pack of staticData.packs) {
              const categories = {};
              const packName = pack.folderName;
              
              // Get instruments for this pack
              const instrumentFolders = staticData.instruments[packName] || [];
              
              for (const folderName of instrumentFolders) {
                const samples = staticData.samples[packName]?.[folderName] || [];
                if (samples.length > 0) {
                  categories[folderName] = {
                    samples: samples.map(sample => sample.path)
                  };
                }
              }
              
              if (Object.keys(categories).length > 0) {
                discoveredPacks.push({
                  id: pack.id,
                  name: pack.name,
                  description: pack.description,
                  coverImage: pack.coverImage,
                  categories: categories
                });
                console.log(`✅ Static pack loaded: ${pack.name} with ${Object.keys(categories).length} instruments`);
              }
            }
          } else {
            throw new Error('Static data not available - using dynamic API');
          }
        } catch (staticError) {
          console.log('📡 Static data not found, trying dynamic API (dev mode)...');
          
          // Fallback to dynamic API discovery
          try {
            // Step 1: Discover all available packs
            const packsResponse = await fetch('/api/discover-packs');
            const packsData = await packsResponse.json();
            console.log('📦 Found packs via API:', packsData.packs?.length || 0);
            
            if (packsData.packs && packsData.packs.length > 0) {
              // Step 2: For each pack, discover instruments and samples
              for (const pack of packsData.packs) {
                console.log(`🔍 Scanning pack: ${pack.name}`);
                
                // Get instrument folders
                const instrumentsResponse = await fetch(`/api/discover-instruments?pack=${encodeURIComponent(pack.folderName)}`);
                const instrumentsData = await instrumentsResponse.json();
                
                if (instrumentsData.folders && instrumentsData.folders.length > 0) {
                  const categories = {};
                  
                  // Step 3: For each instrument folder, get all samples
                  for (const folderName of instrumentsData.folders) {
                    console.log(`🎼 Scanning instrument: ${folderName}`);
                    
                    const samplesResponse = await fetch(`/api/discover-samples?pack=${encodeURIComponent(pack.folderName)}&folder=${encodeURIComponent(folderName)}`);
                    const samplesData = await samplesResponse.json();
                    
                    if (samplesData.samples && samplesData.samples.length > 0) {
                      // Convert to full paths for compatibility
                      const samplePaths = samplesData.samples.map(fileName => 
                        `/sample-packs-mp3/${pack.folderName}/${folderName}/${fileName}`
                      );
                      
                      categories[folderName] = { samples: samplePaths };
                      console.log(`✅ Found ${samplePaths.length} samples in ${folderName}`);
                    }
                  }
                  
                  if (Object.keys(categories).length > 0) {
                    discoveredPacks.push({
                      id: pack.id,
                      name: pack.name,
                      description: pack.description,
                      coverImage: `/sample-packs-mp3/${pack.folderName}/${pack.coverImage}`,
                      categories: categories
                    });
                    console.log(`✅ Dynamic pack complete: ${pack.name} with ${Object.keys(categories).length} instruments`);
                  }
              }
            }
          }
        } catch (discoveryError) {
          console.warn('⚠️ Real sample discovery failed, using fallback mode:', discoveryError.message);
        }
        }
        
        // Use loaded packs
        const finalPacks = loadedPacks;
        setAvailablePacks(finalPacks);
        console.log(`📦 Successfully initialized ${finalPacks.length} sample packs`);
        
        // Create tracks based on FIXED 8 INSTRUMENTS
        const currentPack = finalPacks[0];
        const fixedInstruments = getFixedInstruments(currentPack);
        const initialTracks: EnhancedTrackPattern[] = fixedInstruments.map((instrument, index) => ({
          id: getTrackIdFromFolder(instrument.originalCategory || `sa_track_${index}`), // Use same system as mobile version
          name: instrument.name, // ✅ REMOVE "Track" suffix - use clean instrument name only
          steps: new Array(16).fill(false), // Each instrument starts with empty pattern
          volume: masterVolume / 100,
          selectedSampleId: '', // Will be set when samples load
          muted: false,
          groove: createDefaultGroove()
        }));
        
        setTracks(initialTracks);
        
        // patterns array is not needed anymore - we read directly from tracks
        
        // Initialize audio engine with dynamic tracks
        audioEngineRef.current.initializeTracks(initialTracks);
        
        // Set up step callback
        audioEngineRef.current.onStepCallback = (trackId: string, sampleId: string, volume: number, time: number) => {
          audioEngineRef.current.playSample(sampleId, volume, time);
        };
        
        // 🎵 CRITICAL: Load default samples for ALL 8 instruments
        const loadDefaultSamples = async () => {
          const currentPack = finalPacks[0];
          for (let i = 0; i < fixedInstruments.length; i++) {
            const instrument = fixedInstruments[i];
            if (instrument?.hasSamples) {
              const defaultSample = getSampleForInstrument(currentPack, instrument, 0);
              if (defaultSample && initialTracks[i]) {
                try {
                  await audioEngineRef.current.loadSample(defaultSample);
                  audioEngineRef.current.updateSelectedSample(initialTracks[i].id, defaultSample);
                  audioEngineRef.current.updateVolume(initialTracks[i].id, masterVolume / 100);
                  
                  // Update track with loaded sample
                  initialTracks[i].selectedSampleId = defaultSample;
                  console.log(`🎼 Loaded default sample for ${instrument.name}: ${defaultSample.split('/').pop()}`);
                } catch (error) {
                  console.error(`❌ Failed to load default sample for ${instrument.name}:`, error);
                }
              }
            }
          }
        };
        
        // Load samples in background
        loadDefaultSamples();
        
        console.log('✅ SoundAngeles Sequencer initialized with all samples loaded');
        
      } catch (error) {
        console.error('❌ Failed to initialize sequencer:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSequencer();
  }, []);

  // BPM SYNCHRONIZATION FIX: Initialize Audio Engine with correct BPM
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setBPM(bpm);
      console.log(`🎵 Audio Engine BPM initialized to ${bpm}`);
    }
  }, [bpm]);
  
  // Initialize pattern banks when tracks are ready
  useEffect(() => {
    if (tracks.length > 0 && patternBanks.length === 0) {
      initializePatternBanks();
    }
  }, [tracks, patternBanks.length, initializePatternBanks]);

  // Handle volume changes without reinitializing
  useEffect(() => {
    if (tracks.length > 0) {
      // Apply master volume as multiplier to individual track volumes
      tracks.forEach((track, index) => {
        const individualVolume = trackVolumes[index] || 75;
        const masterVolumeRatio = masterVolume / 100;
        const finalVolume = (individualVolume / 100) * masterVolumeRatio;
        audioEngineRef.current.updateVolume(track.id, finalVolume);
      });
    }
  }, [masterVolume, tracks, trackVolumes]);

  // PATTERN MANIPULATION - Single row with instrument switching
  const toggleStep = useCallback((step: number) => {
    if (tracks.length === 0) {
      console.warn('⚠️ No tracks available for pattern manipulation');
      return;
    }
    
    // Update the track for the CURRENT instrument
    const currentTrackIndex = currentInstrument;
    
    setTracks(prev => {
      const newTracks = prev.map((track, index) => {
        if (index === currentTrackIndex) { // Current instrument's track
          const newSteps = [...track.steps];
          newSteps[step] = !newSteps[step];
          
          // Update audio engine
          audioEngineRef.current.updatePattern(track.id, step, newSteps[step]);
          
          console.log(`🎵 ${currentInstruments[currentInstrument]?.name || 'Unknown'} Step ${step + 1} toggled: ${newSteps[step] ? 'ON' : 'OFF'}`);
          
          return { ...track, steps: newSteps };
        }
        return track;
      });
      
      // patterns array sync is not needed anymore since we read directly from tracks
      
      return newTracks;
    });
  }, [tracks, currentInstrument, currentInstruments, patterns]);

  // PLAYBACK CONTROLS
  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      audioEngineRef.current.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      saveCurrentPatternToBank(); // Auto-save before playing
      await audioEngineRef.current.start();
      setIsPlaying(true);
    }
  }, [isPlaying, saveCurrentPatternToBank]);

  // Clear current pattern
  const handleClear = useCallback(() => {
    const clearedTracks = tracks.map(track => ({
      ...track,
      steps: new Array(16).fill(false)
    }));
    
    setTracks(clearedTracks);
    
    // Clear in audio engine
    clearedTracks.forEach((track, index) => {
      track.steps.forEach((_, stepIndex) => {
        audioEngineRef.current.updatePattern(track.id, stepIndex, false);
      });
    });
    
    console.log('🧹 Pattern cleared');
  }, [tracks]);

  // BPM Change
  const handleBpmChange = useCallback((value: number[]) => {
    const newBpm = value[0];
    setBpm(newBpm);
    audioEngineRef.current.setBpm(newBpm);
  }, []);

  // Volume Change  
  const handleVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume);
    if (audioEngineRef.current) {
      audioEngineRef.current.setMasterVolume(volume / 100);
    }
  }, []);

  // Handle track volume changes
  const handleTrackVolumeChange = useCallback((trackIndex: number, volume: number) => {
    setTrackVolumes(prev => {
      const newVolumes = [...prev];
      newVolumes[trackIndex] = volume;
      return newVolumes;
    });
    
    // Update audio engine - use updateVolume method
    if (audioEngineRef.current && tracks[trackIndex]) {
      audioEngineRef.current.updateVolume(tracks[trackIndex].id, volume / 100);
      console.log(`🎛️ Volume knob ${trackIndex + 1} (${tracks[trackIndex].name}): ${volume}% -> ${volume / 100}`);
    }
  }, [tracks]);

  // Get sample path for instrument from current pack with sample index
  const getSampleForInstrument = useCallback((pack: any, instrument: any, sampleIndex: number = 0): string => {
    if (!pack?.categories || !instrument.originalCategory) return '';
    
    // Use the originalCategory that was mapped during getFixedInstruments
    const categoryKey = instrument.originalCategory;
    
    if (categoryKey && pack.categories[categoryKey]?.samples?.length > 0) {
      const validIndex = Math.min(sampleIndex, pack.categories[categoryKey].samples.length - 1);
      return pack.categories[categoryKey].samples[validIndex]; // Sample at index
    }
    
    return '';
  }, []);

  // 🔄 RELOAD ALL SAMPLES FOR NEW PACK
  const reloadAllSamplesForNewPack = useCallback(async (newPackIndex: number) => {
    if (availablePacks.length === 0 || !availablePacks[newPackIndex]) return;
    
    const newPack = availablePacks[newPackIndex];
    console.log(`🎵 Reloading all samples for new pack: ${newPack.name}`);
    
    // Reload samples for each track using their current sample index
    for (let i = 0; i < tracks.length && i < currentInstruments.length; i++) {
      const instrument = currentInstruments[i];
      const currentSampleIndex = sampleIndices[i] || 0;
      
      if (instrument?.hasSamples) {
        const sampleToLoad = getSampleForInstrument(newPack, instrument, currentSampleIndex);
        
        if (sampleToLoad && tracks[i]) {
          try {
            // Load the new sample
            await audioEngineRef.current.loadSample(sampleToLoad);
            audioEngineRef.current.updateSelectedSample(tracks[i].id, sampleToLoad);
            
            // Update track state with new sample
            setTracks(prevTracks => prevTracks.map(track => 
              track.id === tracks[i].id 
                ? { ...track, selectedSampleId: sampleToLoad }
                : track
            ));
            
            console.log(`🎼 Reloaded ${instrument.name}: ${sampleToLoad.split('/').pop()}`);
          } catch (error) {
            console.error(`❌ Failed to reload sample for ${instrument.name}:`, error);
          }
        }
      }
    }
  }, [availablePacks, currentInstruments, tracks, sampleIndices, getSampleForInstrument]);

  // SAMPLE PACK NAVIGATION
  const handlePrevPack = useCallback(async () => {
    if (availablePacks.length === 0 || isAutoSwiping) return;
    
    const newIndex = (currentPackIndex - 1 + availablePacks.length) % availablePacks.length;
    setCurrentPackIndex(newIndex);
    
    console.log('📦 Switched to pack:', availablePacks[newIndex]?.name);
    
    // 🎵 CRITICAL: Reload all samples for the new pack
    await reloadAllSamplesForNewPack(newIndex);
  }, [availablePacks, currentPackIndex, isAutoSwiping, reloadAllSamplesForNewPack]);

  const handleNextPack = useCallback(async () => {
    if (availablePacks.length === 0 || isAutoSwiping) return;
    
    const newIndex = (currentPackIndex + 1) % availablePacks.length;
    setCurrentPackIndex(newIndex);
    
    console.log('📦 Switched to pack:', availablePacks[newIndex]?.name);
    
    // 🎵 CRITICAL: Reload all samples for the new pack
    await reloadAllSamplesForNewPack(newIndex);
  }, [availablePacks, currentPackIndex, isAutoSwiping, reloadAllSamplesForNewPack]);
  
  // HERO SLIDER ANIMATION - Fast slide-through all packs on first load
  const startHeroSliderDemo = useCallback(() => {
    if (availablePacks.length <= 1 || hasShownAllPacks) return;
    
    console.log('🎬 Starting hero slider demo - fast slide through all packs...');
    setIsAutoSwiping(true);
    
    let slideIndex = 0;
    const totalSlides = availablePacks.length;
    
    const slideNext = () => {
      if (slideIndex < totalSlides - 1) {
        slideIndex++;
        setCurrentPackIndex(slideIndex);
        setTimeout(slideNext, 600); // 600ms per slide - fast!
      } else {
        // Demo complete - return to first pack
        setTimeout(() => {
          setCurrentPackIndex(0);
          setIsAutoSwiping(false);
          setHasShownAllPacks(true);
          console.log('✅ Hero slider demo completed - user can now interact');
        }, 300);
      }
    };
    
    // Start sliding
    setTimeout(slideNext, 600);
  }, [availablePacks.length, hasShownAllPacks]);
  
  // HERO SLIDER TRIGGER - Start when packs are loaded
  useEffect(() => {
    if (availablePacks.length > 1 && !hasShownAllPacks && !isLoading) {
      // Start hero slider demo after short delay
      const startDelay = setTimeout(() => {
        startHeroSliderDemo();
      }, 1000); // 1s delay after load
      
      return () => clearTimeout(startDelay);
    }
  }, [availablePacks.length, hasShownAllPacks, isLoading, startHeroSliderDemo]);
  
  // INSTRUMENT SWITCHING - Load appropriate sample
  const handleInstrumentChange = useCallback(async (instrumentIndex: number) => {
    setCurrentInstrument(instrumentIndex);
    
    if (availablePacks.length === 0 || tracks.length === 0) {
      console.log(`🎼 Switched to ${currentInstruments[instrumentIndex]?.name} (no samples available)`);
      return;
    }
    
    const currentPack = availablePacks[currentPackIndex];
    const instrument = currentInstruments[instrumentIndex];
    
    // Find matching samples in current pack
    const currentSampleIndex = sampleIndices[instrumentIndex] || 0;
    const sampleToLoad = getSampleForInstrument(currentPack, instrument, currentSampleIndex);
    
    if (sampleToLoad && tracks.length > instrumentIndex) {
      try {
        // Load sample
        await audioEngineRef.current.loadSample(sampleToLoad);
        audioEngineRef.current.updateSelectedSample(tracks[instrumentIndex].id, sampleToLoad);
        
        // 🎛️ WICHTIG: Volume nach Instrument-Wechsel synchronisieren
        const currentVolume = trackVolumes[instrumentIndex] || 75;
        audioEngineRef.current.updateVolume(tracks[instrumentIndex].id, currentVolume / 100);
        
        // Update track with new sample (for the specific instrument)
        const updatedTracks = tracks.map((track, index) => 
          index === instrumentIndex 
            ? { ...track, selectedSampleId: sampleToLoad }
            : track
        );
        
        setTracks(updatedTracks);
        
        console.log(`🎼 Loaded sample for ${instrument.name}: ${sampleToLoad} @ ${currentVolume}%`);
      } catch (error) {
        console.warn(`⚠️ Failed to load sample for ${instrument.name}:`, error.message);
      }
    } else {
      console.log(`🎼 Switched to ${instrument.name} (no matching samples found)`);
    }
  }, [availablePacks, currentPackIndex, currentInstruments, tracks]);
  
  // getSampleForInstrument function moved above for proper hoisting
  
  // SAMPLE CYCLING - Navigate through samples for current instrument
  // Load sample for specific instrument index
  const loadSampleForInstrument = useCallback(async (instrumentIndex: number, sampleIndex: number) => {
    if (availablePacks.length === 0 || !tracks[instrumentIndex]) return;
    
    const currentPack = availablePacks[currentPackIndex];
    const instrument = currentInstruments[instrumentIndex];
    
    const sampleToLoad = getSampleForInstrument(currentPack, instrument, sampleIndex);
    if (sampleToLoad) {
      try {
        await audioEngineRef.current.loadSample(sampleToLoad);
        audioEngineRef.current.updateSelectedSample(tracks[instrumentIndex].id, sampleToLoad);
        
        // 🎛️ WICHTIG: Volume nach Sample-Wechsel synchronisieren
        const currentVolume = trackVolumes[instrumentIndex] || 75;
        audioEngineRef.current.updateVolume(tracks[instrumentIndex].id, currentVolume / 100);
        
        // Update track data
        setTracks(prev => prev.map((track, index) => 
          index === instrumentIndex 
            ? { ...track, selectedSampleId: sampleToLoad }
            : track
        ));
        
        console.log(`🎼 Loaded sample for ${instrument.name}: ${sampleToLoad.split('/').pop()} @ ${currentVolume}%`);
      } catch (error) {
        console.error(`❌ Failed to load sample for ${instrument.name}:`, error);
      }
    }
  }, [availablePacks, currentPackIndex, currentInstruments, tracks]);

  // Sample Navigation für WippSchalter
  const handlePreviousSample = useCallback((instrumentIndex: number) => {
    const instrument = currentInstruments[instrumentIndex];
    if (!instrument?.hasSamples) return;

    const currentPack = availablePacks[currentPackIndex];
    const samples = currentPack?.categories?.[instrument.originalCategory]?.samples || [];
    if (samples.length <= 1) return;

    console.log(`⬅️ BEFORE - ${instrument.name} sampleIndex: ${sampleIndices[instrumentIndex]}, samples.length: ${samples.length}`);

    const newSampleIndex = (sampleIndices[instrumentIndex] - 1 + samples.length) % samples.length;
    
    setSampleIndices(prev => {
      const newIndices = [...prev];
      newIndices[instrumentIndex] = newSampleIndex;
      console.log(`⬅️ AFTER - ${instrument.name} sampleIndex: ${newSampleIndex}`);
      return newIndices;
    });

    // Load new sample
    const sampleToLoad = samples[newSampleIndex];
    console.log(`⬅️ Loading sample: ${sampleToLoad?.split('/').pop()}`);
    
    if (sampleToLoad && tracks.length > instrumentIndex) {
      audioEngineRef.current.loadSample(sampleToLoad).then(() => {
        audioEngineRef.current.updateSelectedSample(tracks[instrumentIndex].id, sampleToLoad);
        
        // 🎛️ WICHTIG: Volume nach Sample-Wechsel synchronisieren
        const currentVolume = trackVolumes[instrumentIndex] || 75;
        audioEngineRef.current.updateVolume(tracks[instrumentIndex].id, currentVolume / 100);
        
        setTracks(prev => prev.map((track, index) => 
          index === instrumentIndex 
            ? { ...track, selectedSampleId: sampleToLoad }
            : track
        ));
        console.log(`⬅️ Previous sample for ${instrument.name}: ${sampleToLoad.split('/').pop()} @ ${currentVolume}%`);
      }).catch(error => {
        console.error(`❌ Failed to load previous sample:`, error);
      });
    }
  }, [availablePacks, currentPackIndex, currentInstruments, sampleIndices, tracks]);

  const handleNextSample = useCallback((instrumentIndex: number) => {
    const instrument = currentInstruments[instrumentIndex];
    if (!instrument?.hasSamples) return;

    const currentPack = availablePacks[currentPackIndex];
    const samples = currentPack?.categories?.[instrument.originalCategory]?.samples || [];
    if (samples.length <= 1) return;

    console.log(`➡️ BEFORE - ${instrument.name} sampleIndex: ${sampleIndices[instrumentIndex]}, samples.length: ${samples.length}`);

    const newSampleIndex = (sampleIndices[instrumentIndex] + 1) % samples.length;
    
    setSampleIndices(prev => {
      const newIndices = [...prev];
      newIndices[instrumentIndex] = newSampleIndex;
      console.log(`➡️ AFTER - ${instrument.name} sampleIndex: ${newSampleIndex}`);
      return newIndices;
    });

    // Load new sample
    const sampleToLoad = samples[newSampleIndex];
    console.log(`➡️ Loading sample: ${sampleToLoad?.split('/').pop()}`);
    
    if (sampleToLoad && tracks.length > instrumentIndex) {
      audioEngineRef.current.loadSample(sampleToLoad).then(() => {
        audioEngineRef.current.updateSelectedSample(tracks[instrumentIndex].id, sampleToLoad);
        
        // 🎛️ WICHTIG: Volume nach Sample-Wechsel synchronisieren
        const currentVolume = trackVolumes[instrumentIndex] || 75;
        audioEngineRef.current.updateVolume(tracks[instrumentIndex].id, currentVolume / 100);
        
        setTracks(prev => prev.map((track, index) => 
          index === instrumentIndex 
            ? { ...track, selectedSampleId: sampleToLoad }
            : track
        ));
        console.log(`➡️ Next sample for ${instrument.name}: ${sampleToLoad.split('/').pop()} @ ${currentVolume}%`);
      }).catch(error => {
        console.error(`❌ Failed to load next sample:`, error);
      });
    }
  }, [availablePacks, currentPackIndex, currentInstruments, sampleIndices, tracks]);
  
  // Test current sample
  const testCurrentSample = useCallback(() => {
    if (tracks.length > 0 && tracks[0].selectedSampleId) {
      const volume = masterVolume / 100;
      audioEngineRef.current.playSample(tracks[0].selectedSampleId, volume);
      console.log('🧪 Testing sample:', tracks[0].selectedSampleId);
    } else {
      console.log('⚠️ No samples loaded for testing');
    }
  }, [tracks, masterVolume]);

  // VISUAL UPDATE LOOP
  useEffect(() => {
    if (isPlaying) {
      const updateVisuals = () => {
        if (audioEngineRef.current && isPlaying) {
          setCurrentStep(audioEngineRef.current.getCurrentStep());
          visualUpdateRef.current = requestAnimationFrame(updateVisuals);
        }
      };
      updateVisuals();
    } else {
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
        visualUpdateRef.current = null;
      }
    }
    
    return () => {
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
      }
    };
  }, [isPlaying]);
  
  // BPM KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setBpm(prev => {
            const newBpm = Math.min(200, prev + (event.shiftKey ? 10 : 1));
            if (audioEngineRef.current) {
              audioEngineRef.current.setBPM(newBpm);
            }
            return newBpm;
          });
          break;
          
        case 'ArrowDown':
          event.preventDefault();
          setBpm(prev => {
            const newBpm = Math.max(60, prev - (event.shiftKey ? 10 : 1));
            if (audioEngineRef.current) {
              audioEngineRef.current.setBPM(newBpm);
            }
            return newBpm;
          });
          break;
          
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Blueprint overlay for development
  const blueprintOverlay = useBlueprintOverlay();
  
  // QUANTIZATION PRESETS DEFINITION
  const quantizationPresets: QuantizationPreset[] = [
    { id: 'straight', name: 'STRAIGHT', description: 'Perfect timing - no swing (0%)' },
    { id: 'slight', name: 'SLIGHT', description: 'Minimal swing feel (~8-15%)' },
    { id: 'swing', name: 'SWING', description: 'Standard swing feel (~20-25%)' }
  ];
  
  // LOAD SAMPLE FOR CURRENT INSTRUMENT
  useEffect(() => {
    if (availablePacks.length > 0 && tracks.length > 0) {
      handleInstrumentChange(currentInstrument);
    }
  }, [availablePacks, currentPackIndex, tracks.length]);

  if (isLoading) {
    return (
      <div className="soundangeles-drum-sequencer min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-4">SoundAngeles</h1>
          <p className="text-gray-600 mb-4">Initializing Professional Drum Sequencer...</p>
          <div className="animate-pulse">
            <div className="bg-gray-200 h-4 w-64 mx-auto rounded mb-4"></div>
            <div className="bg-gray-200 h-4 w-48 mx-auto rounded"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Loading samples and audio engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
        className={cn(
          "soundangeles-drum-sequencer",
          embedded ? "embedded-mode" : "standalone-mode"
        )}
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          minHeight: embedded ? 'auto' : '100vh',
          padding: embedded ? '2rem' : '4rem 2rem',
        }}
      >
      {/* Main Container */}
      <div className="max-w-6xl mx-auto">
        


        {/* Main Control Panel - Responsive Workspace */}
        <div 
          className="rounded-none border mx-auto responsive-workspace"
          style={{ 
            backgroundColor: colors.surface,
            // Subtiles Grain/Noise für Hardware-Authentizität
            backgroundImage: `
              radial-gradient(circle at 20% 50%, transparent 20%, rgba(0,0,0,0.015) 21%, rgba(0,0,0,0.015) 34%, transparent 35%, transparent),
              linear-gradient(0deg, transparent 24%, rgba(0,0,0,0.01) 25%, rgba(0,0,0,0.01) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.01) 75%, rgba(0,0,0,0.01) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(0,0,0,0.01) 25%, rgba(0,0,0,0.01) 26%, transparent 27%, transparent 74%, rgba(0,0,0,0.01) 75%, rgba(0,0,0,0.01) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '3px 3px, 3px 3px, 3px 3px',
            borderColor: colors.border,
            borderWidth: '1px',
            width: '100%',
            maxWidth: '1940px', // 40px mehr für das zusätzliche Padding
            height: '715px',     // SAFARI FIX: height statt minHeight
            minHeight: '715px',  // Fallback für andere Browser
            padding: '20px 90px 20px 90px', // 20px mehr Padding links/rechts (70px → 90px)
            position: 'relative',
            display: 'flex',     // SAFARI FIX: Explizites Flexbox
            flexDirection: 'column',
            overflow: 'hidden'   // SAFARI FIX: Verhindert Überläufe
          }}
        >
          {/* SUPER EINFACHE HOLZPANEELE - 5px schmäler */}
          <img src="/ui-elements/Woodpanels/wood-left.png" alt="" style={{position:'absolute',left:0,top:0,height:'100%',width:'45px',zIndex:5}} />
          <img src="/ui-elements/Woodpanels/wood-right.png" alt="" style={{position:'absolute',right:0,top:0,height:'100%',width:'45px',zIndex:5}} />
          
          {/* HARDWARE SCHRAUBEN - 4 Ecken auf der grauen Fläche mit 20px Abstand */}
          <img src="/ui-elements/screw.png" alt="" style={{position:'absolute',top:'20px',left:'65px',width:'18px',height:'18px',zIndex:100}} />
          <img src="/ui-elements/screw.png" alt="" style={{position:'absolute',top:'20px',right:'65px',width:'18px',height:'18px',zIndex:100}} />
          <img src="/ui-elements/screw.png" alt="" style={{position:'absolute',bottom:'20px',left:'65px',width:'18px',height:'18px',zIndex:100}} />
          <img src="/ui-elements/screw.png" alt="" style={{position:'absolute',bottom:'20px',right:'65px',width:'18px',height:'18px',zIndex:100}} />
          
          {/* COPYRIGHT - Zentriert auf Höhe der unteren Schrauben */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: colors.textMuted,
            fontSize: '11px',
            fontWeight: '500',
            letterSpacing: '0.5px',
            zIndex: 10,
            opacity: 0.7
          }}>
            © 2025 SOUNDANGELES™
          </div>
          {/* DREI-REIHEN-LAYOUT */}
          <div className="drei-reihen-layout flex flex-col" style={{ flex: '1', minHeight: '675px' }}>
            
            {/* 🔝 OBERSTE REIHE: Absolut zentriertes Cover mit fixen Seitenelementen */}
            <div className="oberste-reihe relative p-4" style={{ height: '260px' }}>
              
              {/* Links: SoundAngeles Logo - Vertikal zentriert + 10px nach unten */}
              <div className="logo-section absolute left-4 flex flex-col items-center" style={{ top: 'calc(50% + 10px)', transform: 'translateY(-50%)' }}>
                <img 
                  src="/SoundAngelesLogo.svg" 
                  alt="SoundAngeles Logo"
                  className="h-9 w-auto mb-1"
                  style={{ filter: 'brightness(0.9)' }}
                />
                <p className="text-xs uppercase tracking-wider font-medium text-center" style={{ color: colors.textMuted }}>
                  DRUM SEQUENZER
                </p>
              </div>
              
              {/* Rechts: Volume Button - Button zentriert, Text absolut positioniert */}
              <div className="volume-section absolute top-1/2 right-0 transform -translate-y-1/2" style={{ width: '300px', right: '0px', zIndex: 50 }}>
                <div className="flex items-center justify-center w-full">
                  <RotaryKnob
                    value={masterVolume}
                    onChange={handleVolumeChange}
                    size="big"
                    min={0}
                    max={100}
                  />
                </div>
                <p className="text-xs uppercase tracking-wider font-medium text-center" style={{ 
                  color: colors.textMuted, 
                  zIndex: 100, 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, 78px)',
                  width: '100%'
                }}>
                  VOLUME
                </p>
              </div>
              
              {/* Mitte: Sample Pack Cover - Absolut zentriert */}
              <div className="drum-pack-section absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {availablePacks[currentPackIndex]?.coverImage && (
                  <div className="flex items-center justify-center gap-2">
                    {/* Linker Pfeil - NÄHER und GRÖßER */}
                    <button
                      onClick={handlePrevPack}
                      className={cn(
                        "p-2 hover:opacity-70 hover:scale-110 transition-all duration-200",
                        isAutoSwiping && "animate-pulse"
                      )}
                      style={{ color: availablePacks.length > 0 ? colors.primary : colors.textMuted }}
                      disabled={availablePacks.length <= 1 || isAutoSwiping}
                      title={isAutoSwiping ? "Auto-preview in progress..." : "Previous sample pack"}
                    >
                      <ChevronLeft size={32} />
                    </button>
                    
                    {/* DISPLAY VIEWPORT - Fixed 240x240 window INCLUDING border */}
                    <div 
                      style={{ 
                        width: '240px', 
                        height: '240px',
                        borderColor: colors.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderRadius: '4px',
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: colors.surface,
                        boxSizing: 'border-box'  // CRITICAL: Border is INSIDE the 240px!
                      }}
                    >
                      {/* Slider track with all covers */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          display: 'flex',
                          flexDirection: 'row',
                          transition: 'transform 300ms ease-in-out',
                          transform: `translateX(-${currentPackIndex * 238}px)`, // Match the image width
                          height: '240px'
                        }}
                      >
                        {availablePacks.map((pack, index) => (
                          <div
                            key={`pack-${index}`}
                            style={{
                              width: '238px',
                              height: '238px',
                              position: 'relative',
                              flexShrink: 0
                            }}
                          >
                            <img 
                              src={pack.coverImage} 
                              alt={`Sample Pack ${index + 1}`}
                              style={{
                                width: '180px',  // 75% of 240px for proper spacing
                                height: '180px', 
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: '4px',
                                position: 'absolute',
                                top: '0',
                                left: '0'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Rechter Pfeil - NÄHER und GRÖßER */}
                    <button
                      onClick={handleNextPack}
                      className={cn(
                        "p-2 hover:opacity-70 hover:scale-110 transition-all duration-200",
                        isAutoSwiping && "animate-pulse"
                      )}
                      style={{ color: availablePacks.length > 0 ? colors.primary : colors.textMuted }}
                      disabled={availablePacks.length <= 1 || isAutoSwiping}
                      title={isAutoSwiping ? "Auto-preview in progress..." : "Next sample pack"}
                    >
                      <ChevronRight size={32} />
                    </button>
                  </div>
                )}
                
                {/* ADD TO CART BUTTON - Desktop Version */}
                {availablePacks.length > 0 && (
                  <div style={{ 
                    marginTop: '20px', 
                    marginLeft: '56px',  // 4px nach links (60px - 4px = 56px)
                    width: '180px',  // Gleiche Breite wie Cover
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <AddToCartButton 
                      packName={availablePacks[currentPackIndex]?.name || ''}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
              
            </div>
            
            {/* 🔄 MITTLERE REIHE: Quantisierung + Transport */}
            <div className="mittlere-reihe-responsive gap-6">
              {/* Quantisierung Sektion */}
              <div className="quantisierung-sektion" style={{ border: 'none', backgroundColor: 'transparent', minHeight: '80px', display: 'flex', alignItems: 'center', padding: '16px 0px 16px 0px' }}>
                <div className="flex items-center gap-1 w-full" style={{ padding: '0px', margin: '0px' }}>
                  {['STRAIGHT', 'SLIGHT', 'SWING'].map(preset => {
                    const presetId = preset.toLowerCase().split(' ')[0];
                    return (
                      <Button
                        key={presetId}
                        onClick={() => handleQuantizationChange(presetId)}
                        className="px-3 py-2 rounded-none text-sm font-medium flex-1"
                        style={{
                          backgroundColor: currentGroovePreset === presetId ? colors.primary : colors.surface,
                          color: currentGroovePreset === presetId ? 'white' : colors.text,
                          border: `1px solid ${currentGroovePreset === presetId ? colors.primary : colors.border}`,
                        }}
                      >
                        {preset}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              {/* BPM Control Sektion */}
              <div className="bpm-sektion" style={{ border: 'none', backgroundColor: 'transparent', minHeight: '80px', display: 'flex', alignItems: 'center', padding: '16px 0px 16px 0px' }}>
                <div className="bpm-container flex items-center gap-3" style={{ padding: '0px', margin: '0px', width: '100%' }}>
                  
                  {/* BPM Display */}
                  <div 
                    className="text-2xl font-mono font-bold py-1 rounded border"
                    style={{ 
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      fontFamily: 'monospace',
                      minWidth: '90px',
                      width: '90px',
                      textAlign: 'center',
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {bpm}
                  </div>
                  
                  {/* BPM Controls */}
                  <div className="flex gap-1">
                    {/* Schneller Button (Pfeil nach oben) */}
                    <Button
                      onClick={() => {
                        const newBpm = Math.min(200, bpm + 1);
                        setBpm(newBpm);
                        if (audioEngineRef.current) {
                          audioEngineRef.current.setBPM(newBpm);
                        }
                      }}
                      className="w-8 h-6 p-0 rounded-none border flex items-center justify-center"
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <ChevronUp size={14} />
                    </Button>
                    
                    {/* Langsamer Button (Pfeil nach unten) */}
                    <Button
                      onClick={() => {
                        const newBpm = Math.max(60, bpm - 1);
                        setBpm(newBpm);
                        if (audioEngineRef.current) {
                          audioEngineRef.current.setBPM(newBpm);
                        }
                      }}
                      className="w-8 h-6 p-0 rounded-none border flex items-center justify-center"
                      style={{
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <ChevronDown size={14} />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Transport Sektion - Single Row Layout */}
              <div className="transport-sektion" style={{ border: 'none', backgroundColor: 'transparent', minHeight: '80px', display: 'flex', alignItems: 'center', padding: '16px 0px 16px 0px' }}>
                {/* Single Row: Play, Banks, Clear - All Horizontal */}
                <div className="flex items-center gap-3 w-full justify-between" style={{ padding: '0px', margin: '0px' }}>
                  
                  {/* Left: Play Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePlayStop}
                      className="px-4 py-2 rounded-none font-semibold transition-all text-sm"
                      style={{
                        backgroundColor: isPlaying ? colors.primary : 'transparent',
                        color: isPlaying ? 'white' : colors.primary,
                        border: `2px solid ${colors.primary}`,
                      }}
                    >
                      {isPlaying ? <Pause className="mr-1" size={16} /> : <Play className="mr-1" size={16} />}
                      {isPlaying ? 'STOP' : 'PLAY'}
                    </Button>
                  </div>
                  
                  {/* Center: Banks & Copy - Two Row Mini Layout */}
                  <div className="flex flex-col gap-1 items-center">
                    {/* Bank Buttons - Top Row */}
                    <div className="flex gap-1 items-center">
                      {patternBanks.map((bank) => {
                        const isAvailable = availableBanks.includes(bank.id);
                        return (
                          <Button
                            key={bank.id}
                            onClick={() => isAvailable && loadPatternFromBank(bank.id)}
                            disabled={!isAvailable}
                            className="rounded-none font-bold"
                            style={{
                              width: '24px',
                              height: '20px',
                              fontSize: '10px',
                              backgroundColor: currentBankId === bank.id ? colors.primary : 
                                             isAvailable ? colors.surface : colors.border,
                              color: currentBankId === bank.id ? 'white' : 
                                     isAvailable ? colors.text : colors.textMuted,
                              border: `1px solid ${currentBankId === bank.id ? colors.primary : colors.border}`,
                              opacity: isAvailable ? 1 : 0.5,
                            }}
                            title={isAvailable ? `Load Pattern ${bank.id}` : `Pattern ${bank.id} not available yet`}
                          >
                            {bank.id}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {/* Copy Buttons - Bottom Row (slightly offset) */}
                    <div className="flex items-center gap-1" style={{ marginLeft: '6px' }}>
                    <Button
                      onClick={() => copyPatternToBank('A', 'B')}
                      disabled={!copyProgress['A-B']}
                      className="px-1 py-1 rounded-none font-medium"
                      style={{
                        backgroundColor: copyProgress['A-B'] ? colors.surface : colors.border,
                        color: copyProgress['A-B'] ? colors.text : colors.textMuted,
                        border: `1px solid ${colors.border}`,
                        width: '32px',
                        height: '16px',
                        fontSize: '8px',
                        opacity: copyProgress['A-B'] ? 1 : 0.5,
                      }}
                    >
                      {copyProgress['A-B'] ? '↗' : '✓'}
                    </Button>
                    <Button
                      onClick={() => copyPatternToBank('B', 'C')}
                      disabled={!copyProgress['B-C']}
                      className="px-1 py-1 rounded-none font-medium"
                      style={{
                        backgroundColor: copyProgress['B-C'] ? colors.surface : colors.border,
                        color: copyProgress['B-C'] ? colors.text : colors.textMuted,
                        border: `1px solid ${colors.border}`,
                        width: '32px',
                        height: '16px',
                        fontSize: '8px',
                        opacity: copyProgress['B-C'] ? 1 : 0.5,
                      }}
                    >
                      {copyProgress['B-C'] ? '↗' : (!copyProgress['A-B'] ? '✓' : '⏸')}
                    </Button>
                    <Button
                      onClick={() => copyPatternToBank('C', 'D')}
                      disabled={!copyProgress['C-D']}
                      className="px-1 py-1 rounded-none font-medium"
                      style={{
                        backgroundColor: copyProgress['C-D'] ? colors.surface : colors.border,
                        color: copyProgress['C-D'] ? colors.text : colors.textMuted,
                        border: `1px solid ${colors.border}`,
                        width: '32px',
                        height: '16px',
                        fontSize: '8px',
                        opacity: copyProgress['C-D'] ? 1 : 0.5,
                      }}
                    >
                      {copyProgress['C-D'] ? '↗' : (!copyProgress['B-C'] ? '✓' : '⏸')}
                    </Button>
                    </div>
                  </div>
                  
                  {/* Right: Clear Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleClear}
                      className="px-3 py-2 rounded-none text-sm font-medium"
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      CLEAR
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 🎵 UNTERSTE REIHE: Sequenzer */}
            <div className="unterste-reihe p-4" style={{ backgroundColor: 'transparent' }}>
              
              {/* Instrument Controls - Desktop: 8 horizontal, Mobile: 2x4 Grid */}
              <div className="instrument-controls-grid gap-2 md:gap-4 mb-6">
                {tracks.slice(0, 8).map((track, idx) => (
                  <div key={`instrument-group-${idx}`} className="flex flex-col items-center gap-3">
                    {/* Volume Knob with Scale Background */}
                    <div className="relative flex items-center justify-center volume-knob-container" style={{ transformOrigin: 'center' }}>
                      {/* Scale Background - zentriert */}
                      <img 
                        src="/ui-elements/knob_mid-volume-instruments/scale_mid_knob_b.png"
                        alt="Volume Scale"
                        className="absolute pointer-events-none"
                        style={{ 
                          zIndex: 0,
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%) translateY(-10px)',
                        }}
                        draggable={false}
                      />
                      
                      {/* Volume Knob - zentriert */}
                      <div style={{ zIndex: 1, position: 'relative' }}>
                        <RotaryKnob
                          value={trackVolumes[idx] || 75}
                          onChange={(val) => {
                            const newVolumes = [...trackVolumes];
                            newVolumes[idx] = val;
                            setTrackVolumes(newVolumes);
                            // Apply volume change to audio engine
                            if (tracks[idx]) {
                              const finalVolume = (val / 100) * (masterVolume / 100);
                              audioEngineRef.current.updateVolume(tracks[idx].id, finalVolume);
                            }
                          }}
                          size="mid"
                          label=""
                        />
                      </div>
                    </div>
                    
                    {/* WippSchalter Component - Dynamic Instrument Names */}
                    <InstrumentWippSchalter
                      instrumentName={(() => {
                        // ✅ FIX: Use currentInstruments array for dynamic naming (NOT track.name)
                        const instrument = currentInstruments[idx];
                        if (instrument && instrument.hasSamples) {
                          // Use the clean name that was already processed in getFixedInstruments
                          return instrument.name;
                        }
                        // Fallback for empty slots
                        return '---';
                      })()}
                      currentSampleIndex={sampleIndices[idx] || 0}
                      totalSamples={(() => {
                        const instrument = currentInstruments[idx];
                        if (instrument?.hasSamples && availablePacks[currentPackIndex]) {
                          const samples = availablePacks[currentPackIndex].categories?.[instrument.originalCategory]?.samples;
                          return samples?.length || 1;
                        }
                        return 1;
                      })()}
                      isActive={currentInstrument === idx}
                      onPreviousSample={() => handlePreviousSample(idx)}
                      onNextSample={() => handleNextSample(idx)}
                      onSelect={() => setCurrentInstrument(idx)}
                    />
                  </div>
                ))}
              </div>


              {/* Desktop: Alle 16 Pads horizontal | Tablet/Mobile: Gruppen */}
              <div className="hidden lg:block mb-2">
                {/* Desktop Layout - Alle 16 horizontal */}
                {/* LED-Laufleiste */}
                <div className="flex justify-between gap-0.5 md:gap-1 px-1 mb-1">
                  {Array.from({ length: 16 }, (_, i) => (
                    <div
                      key={i}
                      className="w-[52px] md:w-[60px] h-1 transition-all"
                      style={{
                        backgroundColor: i === currentStep && isPlaying ? colors.primary : colors.border,
                      }}
                    />
                  ))}
                </div>
                
                {/* 16 Pads horizontal */}
                <div className="flex justify-between gap-0.5 md:gap-1 px-1">
                  {Array.from({ length: 16 }, (_, step) => {
                    const isActive = tracks[currentInstrument]?.steps[step] || false;
                    const isCurrentStep = step === currentStep && isPlaying;
                    
                    return (
                      <div
                        key={step}
                        onClick={() => {
                          const newTracks = [...tracks];
                          if (newTracks[currentInstrument]) {
                            newTracks[currentInstrument].steps[step] = !isActive;
                            setTracks(newTracks);
                            // Update audio engine
                            audioEngineRef.current.updatePattern(tracks[currentInstrument].id, step, !isActive);
                          }
                        }}
                        className="w-[52px] h-[52px] md:w-[60px] md:h-[60px] relative cursor-pointer transition-all hover:scale-105"
                        style={{
                          boxShadow: isCurrentStep ? `0 0 10px ${colors.primary}` : 'none',
                        }}
                        title={`Step ${step + 1} - Click to ${isActive ? 'deactivate' : 'activate'}`}
                      >
                        <img
                          src={isActive ? '/ui-elements/pads/pad_on_2.png' : '/ui-elements/pads/pad_off_2.png'}
                          alt={`Pad ${step + 1}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Tablet Layout - 2x8er Gruppen */}
              <div className="hidden md:block lg:hidden space-y-4 mb-2">
                {Array.from({ length: 2 }, (_, groupIndex) => {
                  const startStep = groupIndex * 8;
                  const stepsInGroup = 8;
                  
                  return (
                    <div key={`tablet-group-${groupIndex}`} className="flex flex-col">
                      {/* LED-Laufleiste für 8 Steps */}
                      <div className="flex justify-between gap-2 mb-2">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          return (
                            <div
                              key={globalStep}
                              className="flex-1 h-1 transition-all"
                              style={{
                                backgroundColor: globalStep === currentStep && isPlaying ? colors.primary : colors.border,
                              }}
                            />
                          );
                        })}
                      </div>
                      
                      {/* 8 Pads für diese Gruppe */}
                      <div className="flex justify-between gap-2 mb-2">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          const isActive = tracks[currentInstrument]?.steps[globalStep] || false;
                          const isCurrentStep = globalStep === currentStep && isPlaying;
                          
                          return (
                            <div
                              key={globalStep}
                              onClick={() => {
                                const newTracks = [...tracks];
                                if (newTracks[currentInstrument]) {
                                  newTracks[currentInstrument].steps[globalStep] = !isActive;
                                  setTracks(newTracks);
                                  // Update audio engine
                                  audioEngineRef.current.updatePattern(tracks[currentInstrument].id, globalStep, !isActive);
                                }
                              }}
                              className="flex-1 aspect-square relative cursor-pointer transition-all hover:scale-105 max-w-[85px]"
                              style={{
                                boxShadow: isCurrentStep ? `0 0 10px ${colors.primary}` : 'none',
                              }}
                              title={`Step ${globalStep + 1} - Click to ${isActive ? 'deactivate' : 'activate'}`}
                            >
                              <img
                                src={isActive ? '/ui-elements/pads/pad_on_2.png' : '/ui-elements/pads/pad_off_2.png'}
                                alt={`Pad ${globalStep + 1}`}
                                className="w-full h-full object-contain"
                                draggable={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Step-Zahlen mit Beat Markers für 8 Steps */}
                      <div className="flex justify-between gap-2">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          const stepNumber = globalStep + 1;
                          const isBeatMarker = (globalStep % 4) === 0;
                          
                          return (
                            <div key={`tablet-step-${globalStep}`} className="flex-1 text-center flex flex-col items-center max-w-[85px]">
                              <div className="text-xs" style={{ color: colors.textMuted }}>
                                {stepNumber}
                              </div>
                              {isBeatMarker && (
                                <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: colors.primary }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Layout - 4x4er Gruppen */}
              <div className="block md:hidden space-y-3 mb-2">
                {Array.from({ length: 4 }, (_, groupIndex) => {
                  const startStep = groupIndex * 4;
                  const stepsInGroup = 4;
                  
                  return (
                    <div key={`mobile-group-${groupIndex}`} className="flex flex-col">
                      {/* LED-Laufleiste für 4 Steps */}
                      <div className="flex justify-between gap-3 mb-3">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          return (
                            <div
                              key={globalStep}
                              className="flex-1 h-1 transition-all"
                              style={{
                                backgroundColor: globalStep === currentStep && isPlaying ? colors.primary : colors.border,
                              }}
                            />
                          );
                        })}
                      </div>
                      
                      {/* 4 Pads für diese Gruppe */}
                      <div className="flex justify-between gap-3 mb-3">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          const isActive = tracks[currentInstrument]?.steps[globalStep] || false;
                          const isCurrentStep = globalStep === currentStep && isPlaying;
                          
                          return (
                            <div
                              key={globalStep}
                              onClick={() => {
                                const newTracks = [...tracks];
                                if (newTracks[currentInstrument]) {
                                  newTracks[currentInstrument].steps[globalStep] = !isActive;
                                  setTracks(newTracks);
                                  // Update audio engine
                                  audioEngineRef.current.updatePattern(tracks[currentInstrument].id, globalStep, !isActive);
                                }
                              }}
                              className="flex-1 aspect-square relative cursor-pointer transition-all hover:scale-105 max-w-[120px]"
                              style={{
                                boxShadow: isCurrentStep ? `0 0 10px ${colors.primary}` : 'none',
                              }}
                              title={`Step ${globalStep + 1} - Click to ${isActive ? 'deactivate' : 'activate'}`}
                            >
                              <img
                                src={isActive ? '/ui-elements/pads/pad_on_2.png' : '/ui-elements/pads/pad_off_2.png'}
                                alt={`Pad ${globalStep + 1}`}
                                className="w-full h-full object-contain"
                                draggable={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Step-Zahlen mit Beat Markers für 4 Steps */}
                      <div className="flex justify-between gap-3">
                        {Array.from({ length: stepsInGroup }, (_, localStep) => {
                          const globalStep = startStep + localStep;
                          const stepNumber = globalStep + 1;
                          const isBeatMarker = (globalStep % 4) === 0;
                          
                          return (
                            <div key={`mobile-step-${globalStep}`} className="flex-1 text-center flex flex-col items-center max-w-[120px]">
                              <div className="text-sm font-medium" style={{ color: colors.textMuted }}>
                                {stepNumber}
                              </div>
                              {isBeatMarker && (
                                <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ backgroundColor: colors.primary }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step Numbers with Beat Markers - NUR FÜR DESKTOP */}
              <div className="hidden lg:block">
                <div className="flex justify-between gap-0.5 md:gap-1 px-1 mt-1">
                  {Array.from({ length: 16 }, (_, i) => {
                    const stepNumber = i + 1;
                    const isBeatMarker = (i % 4) === 0; // 1, 5, 9, 13
                    return (
                      <div
                        key={i}
                        className="w-[52px] md:w-[60px] text-center flex flex-col items-center"
                      >
                        {/* Step Number */}
                        <div 
                          className="text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          {stepNumber}
                        </div>
                        {/* Beat Marker Circle - RED */}
                        {isBeatMarker && (
                          <div 
                            className="w-1 h-1 rounded-full mt-0.5"
                            style={{ backgroundColor: colors.primary }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Blueprint Overlay für Entwicklung */}
          <BlueprintOverlay />
          
          {/* Programmer Credits - Als "Aufkleber" auf der Sequencer Oberfläche */}
          <ProgrammerCredits position="desktop" />
          
        </div>
      </div>
    </div>
  );
}

