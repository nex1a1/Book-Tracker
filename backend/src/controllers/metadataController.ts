import { Request, Response } from 'express';
import db from '../config/db.js';

export const getAuthors = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM authors ORDER BY name ASC").all();
    res.json(rows);
  } catch (error: any) { 
    console.error("[getAuthors] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};

export const getPublishers = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM publishers ORDER BY name ASC").all();
    res.json(rows);
  } catch (error: any) { 
    console.error("[getPublishers] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};
