const express = require('express');

const auth = require('../middleware/auth');
const requireSpecialUser = require('../middleware/require-special-user');
const groupsController = require('../controllers/groups.controller');

const groupsRouter = express.Router();
const gruppiRouter = express.Router();

groupsRouter.use(auth);

groupsRouter.get('/my', groupsController.my);
groupsRouter.get('/suggested', groupsController.suggested);
groupsRouter.get('/public', groupsController.publicList);

groupsRouter.post('/', groupsController.create);

groupsRouter.get('/:id', groupsController.detail);
groupsRouter.get('/:id/members', groupsController.members); // ✅ aggiunta qui
groupsRouter.patch('/:id', groupsController.update);
groupsRouter.post('/:id/join', groupsController.join);
groupsRouter.post('/:id/leave', groupsController.leave);

groupsRouter.get('/:id/questions', groupsController.questions);
groupsRouter.post('/:id/questions', groupsController.addQuestion);

groupsRouter.get('/:id/messages', groupsController.messages);
groupsRouter.post('/:id/messages', groupsController.sendMessage);
groupsRouter.patch('/:id/messages/:messageId/pin', requireSpecialUser, groupsController.pinMessage);
groupsRouter.delete('/:id/messages/:messageId', groupsController.deleteMessage);
groupsRouter.post('/:id/messages/:messageId/delete', groupsController.deleteMessage);

gruppiRouter.get('/', groupsController.legacyList);
gruppiRouter.post('/', groupsController.legacyCreate);

module.exports = { groupsRouter, gruppiRouter };
