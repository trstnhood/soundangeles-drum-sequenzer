import fs from 'fs';
import path from 'path';
import { globalSampleSecurity } from './src/audio/SampleSecurity.js';

/**
 * Vite plugin to dynamically discover sample pack directories and files
 */
export function directoryDiscoveryPlugin() {
  return {
    name: 'directory-discovery',
    configureServer(server) {
      // API endpoint to discover sample pack directories
      server.middlewares.use('/api/discover-packs', (req, res, next) => {
        try {
          const samplePacksDir = path.join(process.cwd(), 'public', 'sample-packs-mp3');
          
          if (!fs.existsSync(samplePacksDir)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Sample packs directory not found', packs: [] }));
            return;
          }

          const entries = fs.readdirSync(samplePacksDir, { withFileTypes: true });
          const packs = entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => {
              const packPath = path.join(samplePacksDir, entry.name);
              
              // Generate pack ID from folder name
              const packId = entry.name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .replace(/^-+|-+$/g, '');

              // Look for cover images
              let coverImage = null;
              const possibleCovers = [
                // ILLWILL specific patterns
                `ILLWILL-Drum-Kit-Vol-${entry.name.match(/Vol\. (\d+)/)?.[1] || '1'}-1.jpg`,
                `ILLWILL-Drum-Kit-Vol-${entry.name.match(/Vol\. (\d+)/)?.[1] || '1'}.jpg`, // Vol 3 format
                'ILLWILL-Drum-Kit-Vol-1-1.jpg', // Direct match for Vol 1
                'ILLWILL-Drum-Kit-Vol-2-1.jpg', // Direct match for Vol 2  
                'ILLWILL-Drum-Kit-Vol-3.jpg',   // Direct match for Vol 3 (no -1)
                // Generic patterns
                `${entry.name.replace(/Vol\. (\d+)/, 'Vol-$1')}-1.jpg`,
                `${entry.name.replace(/Vol\. (\d+)/, 'Vol-$1')}.jpg`,
                `${entry.name.replace(/\s/g, '-')}.jpg`,
                'cover.jpg',
                'artwork.jpg'
              ];

              // Removed debug logging for cleaner output

              for (const cover of possibleCovers) {
                const coverPath = path.join(packPath, cover);
                console.log(`  🔎 Checking: ${cover} -> ${fs.existsSync(coverPath) ? 'FOUND' : 'not found'}`);
                if (fs.existsSync(coverPath)) {
                  coverImage = cover;
                  console.log(`✅ Found cover image: ${cover}`);
                  break;
                }
              }
              
              if (!coverImage) {
                console.log(`⚠️ No cover image found for ${entry.name}`);
              }

              return {
                id: packId,
                name: entry.name,
                description: `Professional drum samples - ${entry.name}`,
                folderName: entry.name,
                coverImage: coverImage || 'default-cover.png'
              };
            });

          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(JSON.stringify({ packs }));
        } catch (error) {
          console.error('Error discovering sample packs:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to discover sample packs', packs: [] }));
        }
      });

      // API endpoint to discover instrument folders within a pack
      server.middlewares.use('/api/discover-instruments', (req, res, next) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const packName = decodeURIComponent(url.searchParams.get('pack') || '');
          
          if (!packName) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pack name required', folders: [] }));
            return;
          }

          const packDir = path.join(process.cwd(), 'public', 'sample-packs-mp3', packName);
          
          if (!fs.existsSync(packDir)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pack not found', folders: [] }));
            return;
          }

          const entries = fs.readdirSync(packDir, { withFileTypes: true });
          const folders = entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => entry.name)
            .sort(); // Sort for consistent ordering

          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(JSON.stringify({ folders }));
        } catch (error) {
          console.error('Error discovering instrument folders:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to discover instrument folders', folders: [] }));
        }
      });

      // 🔒 SECURE API: Get sample by secure ID
      server.middlewares.use('/api/secure-sample', (req, res, next) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const secureId = url.searchParams.get('id');
          
          if (!secureId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Secure ID required' }));
            return;
          }

          const realPath = globalSampleSecurity.getRealPath(secureId);
          if (!realPath) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Sample not found' }));
            return;
          }

          // Convert to filesystem path
          const filePath = path.join(process.cwd(), 'public', realPath);
          
          if (!fs.existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found on disk' }));
            return;
          }

          // Serve the actual audio file
          const audioBuffer = fs.readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': 'audio/wav',
            'Content-Length': audioBuffer.length,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000' // 1 year cache
          });
          res.end(audioBuffer);
        } catch (error) {
          console.error('Error serving secure sample:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to serve sample' }));
        }
      });

      // API endpoint to discover WAV files within an instrument folder
      server.middlewares.use('/api/discover-samples', (req, res, next) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const packName = decodeURIComponent(url.searchParams.get('pack') || '');
          const folderName = decodeURIComponent(url.searchParams.get('folder') || '');
          
          if (!packName || !folderName) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pack and folder names required', samples: [] }));
            return;
          }

          const folderDir = path.join(process.cwd(), 'public', 'sample-packs-mp3', packName, folderName);
          
          if (!fs.existsSync(folderDir)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Folder not found', samples: [] }));
            return;
          }

          const entries = fs.readdirSync(folderDir, { withFileTypes: true });
          const wavFiles = entries
            .filter(entry => 
              entry.isFile() && 
              (entry.name.toLowerCase().endsWith('.wav') || entry.name.toLowerCase().endsWith('.mp3'))
            )
            .map(entry => entry.name)
            .sort(); // Sort for consistent ordering

          // 🔒 GENERATE SECURE MAPPINGS
          const secureSamples = wavFiles.map(fileName => {
            const realPath = `/sample-packs-mp3/${packName}/${folderName}/${fileName}`;
            const secureId = globalSampleSecurity.generateSecureId(realPath, packName, folderName);
            
            return {
              fileName,
              secureId,
              // Don't expose real path to frontend!
            };
          });

          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(JSON.stringify({ 
            samples: wavFiles,  // Legacy support
            secureSamples       // New secure format
          }));
        } catch (error) {
          console.error('Error discovering sample files:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to discover sample files', samples: [] }));
        }
      });
    }
  };
}