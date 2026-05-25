const express = require('express');
const auth = require('../middleware/auth');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(auth);

router.get('/', notificationsController.listNotifications);
router.patch('/read-all', notificationsController.markAllNotificationsAsRead);
router.patch('/:id/read', notificationsController.markNotificationAsRead);
router.delete('/:id', notificationsController.deleteNotification);

module.exports = router;