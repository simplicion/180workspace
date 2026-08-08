const express = require('express');
const router = express.Router();
const knowledgeController = require('./knowledge.controller');
// Auth middleware is already applied in index.routes.js via `protect`

// Article CRUD
router.get('/', knowledgeController.getArticles);
router.post('/', knowledgeController.createArticle);
router.get('/:id', knowledgeController.getArticleById);
router.put('/:id', knowledgeController.updateArticle);
router.delete('/:id', knowledgeController.deleteArticle);

// Lock mechanism
router.post('/:id/lock', knowledgeController.lockArticle);
router.post('/:id/unlock', knowledgeController.unlockArticle);

// Linking
router.post('/:id/links', knowledgeController.createLink);
router.get('/links/entity', knowledgeController.getLinksForEntity);

module.exports = router;
