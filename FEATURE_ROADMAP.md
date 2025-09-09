# 🚀 SOUNDANGELES DRUM SEQUENZER - FEATURE ROADMAP

## 📋 Entwicklungsplan & Status

### ✅ Phase 1: Version 7.2 - Cover Animation
**Status:** IN ENTWICKLUNG  
**Ziel:** Sample Pack Cover Animation beim ersten App-Start

#### Features:
- [🔄] **Hero Slider Animation**
  - Automatisches Durchscrollen aller Sample Packs
  - 600ms pro Pack
  - Start 1 Sekunde nach App-Load
  - Visuelles Feedback mit pulsierenden Buttons
  - Stoppt beim ersten Pack nach Durchlauf

#### Technische Details:
- States: `isAutoSwiping`, `hasShownAllPacks`
- Integration in `ProfessionalDrumSequencer.tsx`
- Aus Desktop-Version portiert

---

### 🎵 Phase 2: Audio Features Prototyp
**Status:** GEPLANT  
**Branch:** `prototype/audio-features`

#### BackTrack-System (Option 1)
**Konzept:** Musikalische Begleitspuren ohne Drums

**Implementierung:**
- **Library:** Tone.js GrainPlayer für Time-Stretching
- **Ordnerstruktur:** `/public/backtracks/`
- **Format:** MP3, 8-16 Takte bei 100 BPM
- **Tempo-Range:** 80-120 BPM (ohne Pitch-Änderung)
- **Features:**
  - Automatische BPM-Anpassung
  - Loop-Support
  - Sync mit Drum Pattern

**Benötigte Audio-Files vom User:**
- funk-groove.mp3
- jazz-ballad.mp3
- rock-anthem.mp3
- hip-hop-beat.mp3
- electronic-loop.mp3

#### Effekte-System
**Konzept:** Professionelle Audio-Effekte pro Track oder global

**Geplante Effekte:**
1. **Reverb**
   - ConvolverNode mit Impulse Responses
   - Presets: Room, Hall, Plate

2. **Delay**
   - DelayNode mit Feedback Loop
   - Sync zum BPM
   - Ping-Pong Option

3. **LoFi**
   - BiquadFilterNode (Lowpass)
   - WaveShaperNode (Distortion)
   - Bit-Crusher Effekt

**Architektur:**
```
AudioBuffer → GainNode → EffectChain → Destination
                ↓
         [Reverb] → [Delay] → [Filter]
```

---

### 🌐 Phase 3: Deployment
**Status:** VORBEREITET

#### Vercel Deployment
- Static Site Generation mit Vite
- Environment Variables für API Keys
- CDN für Audio-Assets

#### Shopify Integration
- iframe Einbindung
- Custom App/Widget Option
- CORS Headers konfiguriert

---

## 📅 Timeline

| Phase | Feature | Status | Geschätzte Zeit |
|-------|---------|--------|-----------------|
| 1 | Cover Animation | 🔄 In Arbeit | 1-2 Stunden |
| 2a | BackTrack-System | 📅 Geplant | 2-3 Tage |
| 2b | Effekte-System | 📅 Geplant | 1 Tag |
| 3 | Deployment | ✅ Bereit | 30 Minuten |

---

## 🔧 Technische Anforderungen

### Dependencies (bereits installiert):
- ✅ React 18.3
- ✅ TypeScript 5.8
- ✅ Vite 5.4
- ✅ Web Audio API
- ✅ Tone.js (für BackTrack Time-Stretching)

### Neue Dependencies (bei Bedarf):
- 🔄 SoundTouch.js (Alternative für Time-Stretching)
- 🔄 Reverb Impulse Response Files

---

## 📝 Notizen

### Wichtige Entscheidungen:
1. **BackTrack Option 1 gewählt:** Ein File pro Track + dynamisches Time-Stretching
2. **Tempo-Range:** 80-120 BPM für optimale Audioqualität
3. **Effekte:** Start mit 3 Basis-Effekten, später erweiterbar

### Offene Fragen:
- [ ] Sollen Effekte pro Track oder global sein?
- [ ] Welche BackTrack-Genres sind prioritär?
- [ ] Max. Dateigröße für BackTracks?

---

**Letzte Aktualisierung:** 09.09.2025  
**Verantwortlich:** Claude Code + User