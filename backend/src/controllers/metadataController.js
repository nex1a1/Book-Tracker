import db from '../config/db.js';

export const getAuthors = (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM authors ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) { 
    console.error("[getAuthors] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};

export const getPublishers = (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM publishers ORDER BY name ASC").all();
    res.json(rows);
  } catch (error) { 
    console.error("[getPublishers] Error:", error);
    res.status(500).json({ error: error.message }); 
  }
};
