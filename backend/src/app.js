const express = require('express');
const cors = require('cors');

const { initDb } = require('./db/init');

const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');

const authController = require('./controllers/auth.controller');

const app = express();

// abilito cors in dev
app.use(cors());

// leggo json
app.use(express.json({ limit: '10mb' }));

// preparo il db
initDb()
  .then(() => console.log('db init ok'))
  .catch(err => console.error('db init error:', err));

// root
app.get('/', (req, res) => {
  res.send('StudyBuddy API is running :)');
});

// health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// monto le api vere
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);

// tengo l’alias vecchio per vedere la lista faculties dal browser come prima
app.get('/faculties', authController.faculties);

// 404 pulito
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.path}`);
});

module.exports = app;
