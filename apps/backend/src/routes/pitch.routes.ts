'use strict';

import express from 'express';
import {
  PitchesController,
  GigsController,
  ResourcesController,
  EventsController,
  MediaController,
} from '@workspace/pitch-in-180-network';

const router = express.Router();

// ==========================================
// 1. PITCH REELS (180s Video Feed & Posts)
// ==========================================
router.post('/posts', PitchesController.createPitch);
router.get('/posts/feed', PitchesController.getFeed);
router.get('/posts/:id', PitchesController.getPitch);
router.post('/posts/:id/upvote', PitchesController.toggleUpvote);
router.get('/posts/:id/comments', PitchesController.getComments);
router.post('/posts/:id/comments', PitchesController.addComment);
router.post('/posts/:id/view', PitchesController.recordView);

// ==========================================
// 2. OPPORTUNITIES & STARTUP GIGS
// ==========================================
router.get('/gigs', GigsController.listGigs);
router.get('/gigs/:id', GigsController.getGig);
router.post('/gigs', GigsController.createGig);
router.post('/gigs/:id/apply', GigsController.applyToGig);

// ==========================================
// 3. STARTUP RESOURCES & TOOLS VAULT
// ==========================================
router.get('/resources', ResourcesController.listResources);
router.post('/resources', ResourcesController.createResource);
router.post('/resources/:id/vote', ResourcesController.upvoteResource);

// ==========================================
// 4. DISCOVERY EVENTS & WEBINARS
// ==========================================
router.get('/events', EventsController.listEvents);
router.post('/events', EventsController.createEvent);
router.post('/events/:id/rsvp', EventsController.rsvpEvent);

// ==========================================
// 5. MEDIA & ABR HLS UPLOADS
// ==========================================
router.post('/media/upload-url', MediaController.requestUploadUrl);
router.post('/media/process-video', MediaController.processVideo);

export default router;
