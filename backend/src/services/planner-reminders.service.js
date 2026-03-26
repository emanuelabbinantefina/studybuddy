const { all, get, run } = require('../db/connection');
const { nowIso } = require('../db/init');
const notificationsService = require('./notifications.services');

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_1H_MS = 60 * 60 * 1000;
const REMINDER_NOW_MS = 5 * 60 * 1000;

function formatEventTime(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventTypeLabel(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'exam') return 'Esame';
  if (normalized === 'lezione') return 'Lezione';
  if (normalized === 'studio') return 'Sessione di studio';
  return 'Evento';
}

function getEventIcon(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'exam') return '📝';
  if (normalized === 'lezione') return '📚';
  if (normalized === 'studio') return '✍️';
  return '📅';
}

// ========== REMINDER EVENTI ==========

async function checkAndSendReminders() {
  const now = Date.now();
  const nowIsoString = new Date().toISOString();

  const events = await all(
    `select id, userId, title, type, subject, startAt, location,
            reminder24hSent, reminder1hSent, reminderNowSent
     from Events
     where startAt >= ?
     order by startAt asc`,
    [nowIsoString]
  );

  for (const event of events) {
    const startAt = new Date(event.startAt).getTime();
    if (Number.isNaN(startAt)) continue;

    const diff = startAt - now;

    // Reminder 24h prima
    if (!event.reminder24hSent && diff <= REMINDER_24H_MS && diff > REMINDER_1H_MS) {
      await send24hReminder(event);
    }

    // Reminder 1h prima
    if (!event.reminder1hSent && diff <= REMINDER_1H_MS && diff > REMINDER_NOW_MS) {
      await send1hReminder(event);
    }

    // Reminder "adesso"
    if (!event.reminderNowSent && diff <= REMINDER_NOW_MS && diff > -REMINDER_NOW_MS) {
      await sendNowReminder(event);
    }
  }
}

async function send24hReminder(event) {
  try {
    const icon = getEventIcon(event.type);
    const typeLabel = getEventTypeLabel(event.type);
    const time = formatTimeOnly(event.startAt);
    const subject = event.subject ? ` di ${event.subject}` : '';

    await notificationsService.createForUser({
      userId: event.userId,
      title: `${icon} Domani: ${event.title}`,
      message: `${typeLabel}${subject} alle ${time}`,
      type: 'planner',
      actionUrl: `/tabs/planner`,
    });

    await run(`update Events set reminder24hSent = 1 where id = ?`, [event.id]);
    console.log(`✅ Reminder 24h inviato per evento ${event.id}`);
  } catch (err) {
    console.error('Errore invio reminder 24h:', err);
  }
}

async function send1hReminder(event) {
  try {
    const icon = getEventIcon(event.type);
    const typeLabel = getEventTypeLabel(event.type);
    const time = formatTimeOnly(event.startAt);
    const subject = event.subject ? ` di ${event.subject}` : '';

    await notificationsService.createForUser({
      userId: event.userId,
      title: `${icon} Tra 1 ora: ${event.title}`,
      message: `${typeLabel}${subject} alle ${time}`,
      type: 'planner',
      actionUrl: `/tabs/planner`,
    });

    await run(`update Events set reminder1hSent = 1 where id = ?`, [event.id]);
    console.log(`✅ Reminder 1h inviato per evento ${event.id}`);
  } catch (err) {
    console.error('Errore invio reminder 1h:', err);
  }
}

async function sendNowReminder(event) {
  try {
    const icon = getEventIcon(event.type);
    const typeLabel = getEventTypeLabel(event.type);
    const subject = event.subject ? ` di ${event.subject}` : '';
    const location = event.location ? ` • ${event.location}` : '';

    await notificationsService.createForUser({
      userId: event.userId,
      title: `${icon} Adesso: ${event.title}`,
      message: `${typeLabel}${subject}${location}`,
      type: 'planner',
      actionUrl: `/tabs/planner`,
    });

    await run(`update Events set reminderNowSent = 1 where id = ?`, [event.id]);
    console.log(`✅ Reminder NOW inviato per evento ${event.id}`);
  } catch (err) {
    console.error('Errore invio reminder NOW:', err);
  }
}

async function resetReminderFlags(eventId) {
  await run(
    `update Events
     set reminder24hSent = 0, reminder1hSent = 0, reminderNowSent = 0
     where id = ?`,
    [eventId]
  );
}

// ========== STATISTICHE SETTIMANALI ==========

async function sendWeeklyStats() {
  console.log('📊 Invio statistiche settimanali...');

  // Ottieni tutti gli utenti
  const users = await all(`select id from Users`);

  for (const user of users) {
    await sendUserWeeklyStats(user.id);
  }
}

async function sendUserWeeklyStats(userId) {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lunedì
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const startIso = startOfWeek.toISOString();
    const endIso = endOfWeek.toISOString();

    // Conta eventi della prossima settimana
    const weekEvents = await all(
      `select type, count(*) as count
       from Events
       where userId = ?
         and startAt >= ?
         and startAt < ?
       group by type`,
      [userId, startIso, endIso]
    );

    if (!weekEvents.length) return;

    const exams = weekEvents.find(e => e.type === 'exam')?.count || 0;
    const lessons = weekEvents.find(e => e.type === 'lezione')?.count || 0;
    const study = weekEvents.find(e => e.type === 'studio')?.count || 0;
    const total = exams + lessons + study;

    if (total === 0) return;

    // Costruisci messaggio
    let message = 'Questa settimana hai: ';
    const parts = [];

    if (exams > 0) parts.push(`${exams} esam${exams === 1 ? 'e' : 'i'}`);
    if (lessons > 0) parts.push(`${lessons} lezion${lessons === 1 ? 'e' : 'i'}`);
    if (study > 0) parts.push(`${study} session${study === 1 ? 'e' : 'i'} di studio`);

    message += parts.join(', ');

    // Emoji motivazionale
    let emoji = '📅';
    if (exams > 0) emoji = '📝';
    if (exams >= 3) emoji = '💪';

    await notificationsService.createForUser({
      userId,
      title: `${emoji} Riepilogo settimana`,
      message,
      type: 'planner',
      actionUrl: `/tabs/planner`,
    });

    console.log(`📊 Stats settimanali inviate a utente ${userId}`);
  } catch (err) {
    console.error(`Errore stats utente ${userId}:`, err);
  }
}

// ========== STATISTICHE MENSILI ==========

async function sendMonthlyStats() {
  console.log('📈 Invio statistiche mensili...');

  const users = await all(`select id from Users`);

  for (const user of users) {
    await sendUserMonthlyStats(user.id);
  }
}

async function sendUserMonthlyStats(userId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startIso = startOfMonth.toISOString();
    const endIso = endOfMonth.toISOString();

    // Conta eventi completati questo mese (passati)
    const completedEvents = await all(
      `select type, count(*) as count
       from Events
       where userId = ?
         and startAt >= ?
         and startAt <= ?
       group by type`,
      [userId, startIso, new Date().toISOString()]
    );

    const exams = completedEvents.find(e => e.type === 'exam')?.count || 0;
    const lessons = completedEvents.find(e => e.type === 'lezione')?.count || 0;
    const study = completedEvents.find(e => e.type === 'studio')?.count || 0;
    const total = exams + lessons + study;

    if (total === 0) return;

    // Costruisci messaggio
    const monthName = now.toLocaleString('it-IT', { month: 'long' });
    let message = `A ${monthName} hai completato: `;
    const parts = [];

    if (exams > 0) parts.push(`${exams} esam${exams === 1 ? 'e' : 'i'}`);
    if (lessons > 0) parts.push(`${lessons} lezion${lessons === 1 ? 'e' : 'i'}`);
    if (study > 0) parts.push(`${study} session${study === 1 ? 'e' : 'i'} di studio`);

    message += parts.join(', ') + '. Continua così! 🎉';

    await notificationsService.createForUser({
      userId,
      title: '📈 Riepilogo del mese',
      message,
      type: 'planner',
      actionUrl: `/tabs/planner`,
    });

    console.log(`📈 Stats mensili inviate a utente ${userId}`);
  } catch (err) {
    console.error(`Errore stats mensili utente ${userId}:`, err);
  }
}

// ========== CHECK SE È IL MOMENTO GIUSTO ==========

function isSundayEvening() {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() === 20; // Domenica alle 20:00
}

function isFirstOfMonth() {
  const now = new Date();
  return now.getDate() === 1 && now.getHours() === 10; // 1° del mese alle 10:00
}

async function checkScheduledNotifications() {
  // Statistiche settimanali (domenica sera)
  if (isSundayEvening()) {
    await sendWeeklyStats();
  }

  // Statistiche mensili (1° del mese)
  if (isFirstOfMonth()) {
    await sendMonthlyStats();
  }
}

module.exports = {
  checkAndSendReminders,
  resetReminderFlags,
  sendWeeklyStats,
  sendMonthlyStats,
  checkScheduledNotifications,
};