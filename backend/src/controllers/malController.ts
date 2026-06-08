import { Request, Response } from 'express';
import { config } from '../config/env.js';

export const searchMAL = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    if (!q) {
      res.status(400).json({ error: 'กรุณาส่งคำค้นหามาด้วย (q)' });
      return;
    }
    
    const response = await fetch(`https://api.myanimelist.net/v2/manga?q=${encodeURIComponent(q)}&limit=5&fields=authors{first_name,last_name},num_volumes,start_date,end_date,status`, {
      headers: { 'X-MAL-CLIENT-ID': config.MAL_CLIENT_ID }
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error(`[MAL API] ❌ Error จาก MAL:`, data);
      res.status(response.status).json(data);
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error("[searchMAL] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};
