const notificationsService = require('../services/notifications.services');

function getAuthUserId(req) {
  const userId = Number(req.userData?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return userId;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function listNotifications(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'utente non autenticato' });
    }

    const items = await notificationsService.listByUserId(userId);
    return res.json(items);
  } catch (error) {
    console.error('listNotifications error:', error);
    return res.status(500).json({ message: 'errore nel caricamento notifiche' });
  }
}

async function createNotification(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'utente non autenticato' });
    }

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const type = req.body?.type;
    const actionUrl = req.body?.actionUrl ?? null;

    if (!title) {
      return res.status(400).json({ message: 'title obbligatorio' });
    }

    if (!message) {
      return res.status(400).json({ message: 'message obbligatorio' });
    }

    const created = await notificationsService.createForUser({
      userId,
      title,
      message,
      type,
      actionUrl,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('createNotification error:', error);
    return res.status(500).json({ message: 'errore nella creazione notifica' });
  }
}

async function markNotificationAsRead(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'utente non autenticato' });
    }

    const notificationId = parseId(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ message: 'id notifica non valido' });
    }

    const item = await notificationsService.markAsRead(notificationId, userId);

    if (!item) {
      return res.status(404).json({ message: 'notifica non trovata' });
    }

    return res.json(item);
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    return res.status(500).json({ message: 'errore aggiornamento notifica' });
  }
}

async function markAllNotificationsAsRead(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'utente non autenticato' });
    }

    const result = await notificationsService.markAllAsRead(userId);
    return res.json(result);
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    return res.status(500).json({ message: 'errore aggiornamento notifiche' });
  }
}

async function deleteNotification(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'utente non autenticato' });
    }

    const notificationId = parseId(req.params.id);
    if (!notificationId) {
      return res.status(400).json({ message: 'id notifica non valido' });
    }

    const removed = await notificationsService.removeById(notificationId, userId);

    if (!removed) {
      return res.status(404).json({ message: 'notifica non trovata' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ message: 'errore eliminazione notifica' });
  }
}

module.exports = {
  listNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};