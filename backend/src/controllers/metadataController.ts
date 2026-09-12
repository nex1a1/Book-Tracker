import { Request, Response } from 'express';
import db from '../config/db.js';
import { getErrorMessage } from '../utils/errors.js';

export const getAuthors = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM authors ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) {
    console.error("[getAuthors] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getPublishers = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM publishers ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) {
    console.error("[getPublishers] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
