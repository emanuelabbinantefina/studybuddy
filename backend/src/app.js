const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const groupsRoutes = require('./routes/groups.routes');

const app = express();

app.use(cors());
app.use(express.json());

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

// groups
app.use('/api/groups', groupsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'endpoint non trovato' });
});

module.exports = app;
