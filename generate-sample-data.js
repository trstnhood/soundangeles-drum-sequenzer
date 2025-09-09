/**
 * Generate correct sample-packs-data.json from real files
 */

import fs from 'fs';
import path from 'path';

const samplePacksDir = './public/sample-packs-mp3';
const outputFile = './public/sample-packs-data.json';

function generateSamplePackData() {
  const packData = {
    packs: []
  };

  try {
    const packFolders = fs.readdirSync(samplePacksDir)
      .filter(entry => {
        const fullPath = path.join(samplePacksDir, entry);
        return fs.statSync(fullPath).isDirectory() && !entry.startsWith('.');
      })
      .sort();

    console.log(`Found ${packFolders.length} pack folders:`, packFolders);

    packFolders.forEach((packFolder, packIndex) => {
      console.log(`\nProcessing pack: ${packFolder}`);
      
      const packPath = path.join(samplePacksDir, packFolder);
      
      // Create pack ID
      const packId = `ill-will-vol-${packIndex + 1}`;
      
      // Look for cover image
      let coverImage = 'default-cover.png';
      const coverPatterns = [
        `ILLWILL-Drum-Kit-Vol-${packIndex + 1}-1.jpg`,
        `ILLWILL-Drum-Kit-Vol-${packIndex + 1}.jpg`
      ];
      
      for (const pattern of coverPatterns) {
        if (fs.existsSync(path.join(packPath, pattern))) {
          coverImage = pattern;
          console.log(`  ✅ Found cover: ${coverImage}`);
          break;
        }
      }

      const pack = {
        id: packId,
        name: packFolder,
        description: `Professional drum samples - ${packFolder}`,
        folderName: packFolder,
        coverImage: coverImage,
        instruments: []
      };

      // Find instrument folders
      const instrumentFolders = fs.readdirSync(packPath)
        .filter(entry => {
          const fullPath = path.join(packPath, entry);
          return fs.statSync(fullPath).isDirectory() && !entry.startsWith('.');
        })
        .sort();

      console.log(`  Found ${instrumentFolders.length} instrument folders`);

      instrumentFolders.forEach(instrumentFolder => {
        console.log(`    Processing: ${instrumentFolder}`);
        
        const instrumentPath = path.join(packPath, instrumentFolder);
        
        // Create instrument ID from folder name
        const instrumentId = instrumentFolder
          .toLowerCase()
          .replace(/^\d+[-\s]*/, '') // Remove numeric prefixes
          .replace(/[^a-z0-9\s]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Replace spaces with dashes
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes

        // Create display name
        const displayName = instrumentFolder
          .replace(/^\d+[-\s]*/, '') // Remove numeric prefixes
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        // Find sample files
        const sampleFiles = fs.readdirSync(instrumentPath)
          .filter(entry => {
            const fullPath = path.join(instrumentPath, entry);
            return fs.statSync(fullPath).isFile() && 
                   (entry.toLowerCase().endsWith('.mp3') || entry.toLowerCase().endsWith('.wav'));
          })
          .sort();

        console.log(`      Found ${sampleFiles.length} samples`);

        const instrument = {
          id: instrumentId,
          name: instrumentFolder,
          displayName: displayName,
          samples: sampleFiles
        };

        pack.instruments.push(instrument);
      });

      packData.packs.push(pack);
    });

    // Write the JSON file
    fs.writeFileSync(outputFile, JSON.stringify(packData, null, 2));
    console.log(`\n✅ Generated ${outputFile} with ${packData.packs.length} packs`);
    
    // Summary
    packData.packs.forEach((pack, i) => {
      console.log(`  Pack ${i + 1}: ${pack.name} (${pack.instruments.length} instruments)`);
      pack.instruments.forEach(inst => {
        console.log(`    - ${inst.displayName}: ${inst.samples.length} samples`);
      });
    });

  } catch (error) {
    console.error('Error generating sample pack data:', error);
  }
}

generateSamplePackData();