'use strict';

import express from 'express';
const router = express.Router();
import * as publicToolsController from './public-tools.controller';

/**
 * @route   GET /api/public/tools/youtube-transcript
 * @desc    Extract public YouTube transcript and timestamps
 * @access  Public (Unauthenticated)
 */
router.get('/youtube-transcript', publicToolsController.getYouTubeTranscript);

/**
 * @route   GET /api/public/tools/currencies
 * @desc    Fetch all live world currencies with dynamic symbols & exchange rates
 * @access  Public (Unauthenticated)
 */
router.get('/currencies', publicToolsController.getCurrencies);

export default router;
