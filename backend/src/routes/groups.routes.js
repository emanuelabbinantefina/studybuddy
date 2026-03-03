const express = require('express');

const auth = require('../middleware/auth');
const groupsController = require('../controllers/groups.controller');

const groupsRouter = express.Router();
const gruppiRouter = express.Router();

groupsRouter.use(auth);

groupsRouter.get('/my', groupsController.my);
groupsRouter.get('/suggested', groupsController.suggested);
groupsRouter.get('/public', groupsController.publicList);

groupsRouter.post('/', groupsController.create);

groupsRouter.get('/:id', groupsController.detail);
groupsRouter.post('/:id/join', groupsController.join);
groupsRouter.post('/:id/leave', groupsController.leave);

groupsRouter.get('/:id/messages', groupsController.messages);
groupsRouter.post('/:id/messages', groupsController.sendMessage);

gruppiRouter.get('/', groupsController.legacyList);
gruppiRouter.post('/', groupsController.legacyCreate);

module.exports = { groupsRouter, gruppiRouter };
