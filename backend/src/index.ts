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

// Server Start
app.listen(config.PORT, () => {
  console.log(`🚀 SQL Server running on http://localhost:${config.PORT}`);
});
