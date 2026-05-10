// src/index.js
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { migrateData } from './utils/migration.js';
import apiRoutes from './routes/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Run Database Migration
migrateData();

// Routes
app.use('/api', apiRoutes);

// Server Start
app.listen(config.PORT, () => {
  console.log(`🚀 SQL Server running on http://localhost:${config.PORT}`);
});
