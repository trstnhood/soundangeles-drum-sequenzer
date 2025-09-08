# Vintage Drum Machine Pads

## PNG Asset Files für Vintage Drum Pad States

### Required Assets:
- `pad-normal.png` - Inaktiver Pad (64x64px für Desktop, 48x48px für Mobile)
- `pad-active.png` - Aktiver Pad (grün/gedrückt)
- `pad-current.png` - Current Step Indicator (gelb/orange ring)
- `pad-hover.png` - Hover State (subtile Highlights)

### Sizes:
- **Desktop**: 64x64px (w-16 h-16)
- **Mobile**: 48x48px (w-12 h-12)

### Usage:
CSS `background-image` für dynamisches State-Switching:
```css
background-image: url(/ui-elements/pads/pad-active.png);
background-size: contain;
background-repeat: no-repeat;
```

### Fallback:
Falls PNG nicht lädt → CSS Gradient Fallback wie aktuell implementiert