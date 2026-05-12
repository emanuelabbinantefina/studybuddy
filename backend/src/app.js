const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const notesRoutes = require('./routes/notes.routes');
const { groupsRouter, gruppiRouter } = require('./routes/groups.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const app = express();

// Middleware globali: CORS per far parlare frontend e backend, JSON per leggere req.body.
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Rotta base comoda quando apro il browser e voglio solo sapere se l'API risponde.
app.get('/', (req, res) => {
  res.send('StudyBuddy API is running :)');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
// Alias legacy: alcune chiamate vecchie potrebbero ancora usare /login o /register senza /api/auth.
app.use('/', authRoutes);

// Eventi del planner.
app.use('/api/events', eventsRoutes);

// Appunti: upload, lista, download, salvati.
app.use('/api/appunti', notesRoutes);

// API gruppi nuova, protetta da JWT nelle route.
app.use('/api/groups', groupsRouter);

// API legacy in italiano: il frontend attuale usa ancora /api/gruppi in alcuni punti.
app.use('/api/gruppi', gruppiRouter);

// Notifiche in-app.
app.use('/api/notifications', notificationsRoutes);

// Ultimo middleware: se nessuna route ha risposto, l'endpoint non esiste.
app.use((req, res) => {
  res.status(404).json({ message: 'endpoint non trovato' });
});

module.exports = app;
