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

groupsRouter.get('/:id/topics', groupsController.topics);
groupsRouter.post('/:id/topics', groupsController.addTopic);
groupsRouter.post('/:id/topics/:topicId/reserve', groupsController.reserveTopic);
groupsRouter.post('/:id/topics/:topicId/release', groupsController.releaseTopic);
groupsRouter.post('/:id/topics/:topicId/toggle-done', groupsController.toggleTopicDone);

groupsRouter.get('/:id/sessions', groupsController.sessions);
groupsRouter.post('/:id/sessions', groupsController.addSession);

groupsRouter.get('/:id/questions', groupsController.questions);
groupsRouter.post('/:id/questions', groupsController.addQuestion);

groupsRouter.get('/:id/messages', groupsController.messages);
groupsRouter.post('/:id/messages', groupsController.sendMessage);
groupsRouter.delete('/:id/messages/:messageId', groupsController.deleteMessage);
groupsRouter.post('/:id/messages/:messageId/delete', groupsController.deleteMessage);

gruppiRouter.get('/', groupsController.legacyList);
gruppiRouter.post('/', groupsController.legacyCreate);

module.exports = { groupsRouter, gruppiRouter };
