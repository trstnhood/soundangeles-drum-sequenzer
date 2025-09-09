/**
 * Disabled API Route - Use Static JSON instead
 * This overrides any cached Vercel functions
 */

export default function handler(req, res) {
  res.status(404).json({ 
    error: 'API route disabled', 
    message: 'Use /sample-packs-data.json instead',
    packs: [] 
  });
}