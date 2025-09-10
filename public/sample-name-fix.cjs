// Quick fix: Create lowercase symlinks for all samples
// This ensures both Kick1.mp3 and kick1.mp3 work

const fs = require('fs');
const path = require('path');

const samplePacks = ['Pack_Vol_1', 'Pack_Vol_2', 'Pack_Vol_3'];
const instruments = ['01-KICK', '02-SNARE', '03-HI-HAT', '04-OPEN', '05-RIDE', '06-CLAP', '07-PERC', '08-CONGA'];

samplePacks.forEach(pack => {
  instruments.forEach(instrument => {
    const instrumentDir = `./public/sample-packs-mp3/${pack}/${instrument}`;
    if (fs.existsSync(instrumentDir)) {
      const files = fs.readdirSync(instrumentDir);
      files.forEach(file => {
        if (file.endsWith('.mp3') && file[0] === file[0].toUpperCase()) {
          const lowerFile = file[0].toLowerCase() + file.slice(1);
          const upperPath = path.join(instrumentDir, file);
          const lowerPath = path.join(instrumentDir, lowerFile);
          
          if (!fs.existsSync(lowerPath)) {
            try {
              fs.copyFileSync(upperPath, lowerPath);
              console.log(`Created: ${lowerFile} from ${file}`);
            } catch (err) {
              console.log(`Note: ${lowerFile} already exists or copy failed`);
            }
          }
        }
      });
    }
  });
});

console.log('Sample name fix complete!');