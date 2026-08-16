import express from 'express';
import { createUrl, redirectToUrl, getCodeStats, getCodeMetrics } from '../controllers/urlController.js';
import { rateLimit } from '../services/rateLimit.js';

const Router = express.Router();

Router.post('/urls', rateLimit(10, 60), createUrl);
Router.get('/stats/cache', rateLimit(10, 60), getCodeMetrics);
Router.get('/stats/:code', rateLimit(30, 60), getCodeStats);
Router.get('/:code', rateLimit(10000000, 60), redirectToUrl);

export default Router;