const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sequelize = require('./src/config/db'); 
const User = require('./src/models/User');     
const Faculty = require('./src/models/Faculty');
const Course = require('./src/models/Course');

// Associazioni
Faculty.associate({ Course });
Course.associate({ Faculty });

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "la_tua_chiave_super_segreta";

// Middleware
app.use(cors()); // Abilita CORS per Ionic (localhost:8100)
app.use(express.json()); // Più moderno di bodyParser.json()

// --- SINCRONIZZAZIONE DB E POPOLAMENTO DATI ---
sequelize.sync({ force: false }) // Cambia in 'true' solo se vuoi resettare il DB ogni volta
  .then(async () => {
    console.log('Database sincronizzato con successo!');
    
    // Controllo se il DB è vuoto per inserire dati di test
    const count = await Faculty.count();
    if (count === 0) {
      console.log('Database vuoto. Inserimento dati di test...');
      const f1 = await Faculty.create({ name: 'Ingegneria' });
      const f2 = await Faculty.create({ name: 'Economia' });
      
      await Course.create({ name: 'Informatica', facultyId: f1.id });
      await Course.create({ name: 'Gestionale', facultyId: f1.id });
      await Course.create({ name: 'Marketing', facultyId: f2.id });
      console.log('Dati di test inseriti correttamente.');
    }
  })
  .catch(err => console.error('Errore durante la sincronizzazione del DB:', err));

// --- API ROUTES ---

// 1. OTTENERE FACOLTÀ E CORSI
app.get('/api/auth/faculties', async (req, res) => {
    try {
        console.log("Richiesta ricevuta per /api/auth/faculties");
        const faculties = await Faculty.findAll({ 
          include: [{ model: Course }] 
        });
        res.json(faculties);
    } catch (error) {
        console.error("Errore recupero facoltà:", error);
        res.status(500).json({ message: error.message });
    }
});

// 2. REGISTRAZIONE
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, facolta, corso } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            facolta,
            corso
        });

        res.status(201).json({ message: 'Utente registrato', userId: newUser.id });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Email già esistente' });
        }
        res.status(500).json({ message: error.message });
    }
});

// 3. LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Credenziali non valide' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Rotta di test per la home
app.get('/', (req, res) => {
  res.send('Server API attivo e funzionante sulla porta ' + PORT);
});

// Avvio server ascoltando su 0.0.0.0 per evitare problemi di localhost
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server attivo su http://localhost:${PORT}`);
  console.log(`📍 Endpoint facoltà: http://localhost:${PORT}/api/auth/faculties\n`);
});