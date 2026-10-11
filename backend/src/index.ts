import express from 'express';
import { config } from './config/env.js';
import { migrateData } from './utils/migration.js';
import apiRoutes from './routes/index.js';

const app = express();

// Middleware. No CORS on purpose: the frontend reaches /api through its own origin (Vite proxy), so any page
// on another site is refused when it tries to PATCH/DELETE the local database.
app.use(express.json());

// Run Database Migration
migrateData();

// Routes
app.use('/api', apiRoutes);

// Production image only: serve the built frontend from the same origin (dev uses the Vite proxy instead)
if (process.env.PUBLIC_DIR) app.use(express.static(process.env.PUBLIC_DIR));

// Server Start
app.listen(config.PORT, () => {
  console.log(`🚀 SQL Server running on http://localhost:${config.PORT}`);
});
