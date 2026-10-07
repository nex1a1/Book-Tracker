import { Request, Response } from 'express';
import db from '../config/db.js';
import { getErrorMessage } from '../utils/errors.js';

// Only names some series still uses: rows are never deleted, so a renamed or deleted series would otherwise
// leave its old author/publisher in the filter and the suggestions for good.
export const getAuthors = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM authors WHERE id IN (SELECT author_id FROM series) ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) {
    console.error("[getAuthors] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getPublishers = (req: Request, res: Response) => {
  try {
    const rows = db.prepare("SELECT * FROM publishers WHERE id IN (SELECT publisher_id FROM series) ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) {
    console.error("[getPublishers] Error:", error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
