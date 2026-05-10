import express from 'express';
import * as seriesController from '../controllers/seriesController.js';
import * as metadataController from '../controllers/metadataController.js';
import * as malController from '../controllers/malController.js';
import { validate } from '../middleware/validate.js';
import { createSeriesSchema, updateSeriesSchema } from '../utils/validation.js';

const router = express.Router();

// Series Routes
router.get('/series', seriesController.getSeries);
router.get('/series/stats', seriesController.getStats);
router.post('/series', validate(createSeriesSchema), seriesController.createSeries);
router.patch('/series/:id', validate(updateSeriesSchema), seriesController.updateSeries);
router.delete('/series/:id', seriesController.deleteSeries);

// Metadata Routes
router.get('/authors', metadataController.getAuthors);
router.get('/publishers', metadataController.getPublishers);

// MAL Routes
router.get('/mal/search', malController.searchMAL);

export default router;
