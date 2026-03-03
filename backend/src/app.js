const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const notesRoutes = require('./routes/notes.routes');
const { groupsRouter, gruppiRouter } = require('./routes/groups.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('StudyBuddy API is running :)');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/', authRoutes);

// events
app.use('/api/events', eventsRoutes);

// notes
app.use('/api/appunti', notesRoutes);

// secure groups api
app.use('/api/groups', groupsRouter);

// legacy italian groups api used by current frontend
app.use('/api/gruppi', gruppiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'endpoint non trovato' });
});

module.exports = app;
