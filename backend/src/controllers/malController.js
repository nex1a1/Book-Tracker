import { config } from '../config/env.js';

export const searchMAL = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'กรุณาส่งคำค้นหามาด้วย (q)' });
    
    const response = await fetch(`https://api.myanimelist.net/v2/manga?q=${encodeURIComponent(q)}&limit=5&fields=authors{first_name,last_name},num_volumes,start_date,end_date,status`, {
      headers: { 'X-MAL-CLIENT-ID': config.MAL_CLIENT_ID }
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error(`[MAL API] ❌ Error จาก MAL:`, data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("[searchMAL] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
