const { all, get, run } = require('../db/connection');

const VALID_NOTIFICATION_TYPES = new Set([
  'notes',
  'group',
  'planner',
  'focus',
  'system',
]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeType(type) {
  return VALID_NOTIFICATION_TYPES.has(type) ? type : 'system';
}

function normalizeActionUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function mapNotification(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: Boolean(row.isRead),
    createdAt: row.createdAt,
    actionUrl: row.actionUrl || undefined,
  };
}

async function listByUserId(userId) {
  const rows = await all(
    `select id, title, message, type, actionUrl, isRead, createdAt
     from Notifications
     where userId = ?
     order by datetime(createdAt) desc, id desc`,
    [userId]
  );

  return rows.map(mapNotification);
}

async function findByIdForUser(id, userId) {
  const row = await get(
    `select id, title, message, type, actionUrl, isRead, createdAt
     from Notifications
     where id = ? and userId = ?`,
    [id, userId]
  );

  return mapNotification(row);
}

async function createForUser({ userId, title, message, type = 'system', actionUrl = null }) {
  const now = nowIso();

  const result = await run(
    `insert into Notifications (
      userId, title, message, type, actionUrl, isRead, createdAt, updatedAt
    ) values (?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      userId,
      title.trim(),
      message.trim(),
      normalizeType(type),
      normalizeActionUrl(actionUrl),
      now,
      now,
    ]
  );

  return findByIdForUser(result.lastID, userId);
}

async function createForUsers(userIds = [], payload = {}) {
  const uniqueIds = [...new Set(
    userIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  const created = [];

  for (const userId of uniqueIds) {
    const item = await createForUser({ userId, ...payload });
    if (item) created.push(item);
  }

  return created;
}

async function markAsRead(id, userId) {
  const now = nowIso();

  await run(
    `update Notifications
     set isRead = 1,
         readAt = coalesce(readAt, ?),
         updatedAt = ?
     where id = ? and userId = ?`,
    [now, now, id, userId]
  );

  return findByIdForUser(id, userId);
}

async function markAllAsRead(userId) {
  const now = nowIso();

  const result = await run(
    `update Notifications
     set isRead = 1,
         readAt = coalesce(readAt, ?),
         updatedAt = ?
     where userId = ? and isRead = 0`,
    [now, now, userId]
  );

  return { updated: result.changes };
}

async function removeById(id, userId) {
  const result = await run(
    `delete from Notifications
     where id = ? and userId = ?`,
    [id, userId]
  );

  return result.changes > 0;
}

module.exports = {
  listByUserId,
  findByIdForUser,
  createForUser,
  createForUsers,
  markAsRead,
  markAllAsRead,
  removeById,
};