const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const sequelize = require('./src/config/db'); // Percorso corretto
const User = require('./src/models/User');     // Crea questo file o usa la definizione sotto
const Faculty = require('./src/models/Faculty');
const Course = require('./src/models/Course');

Faculty.associate({ Course });
Course.associate({ Faculty });

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "la_tua_chiave_super_segreta";

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- SINCRONIZZAZIONE DB ---
sequelize.sync()
  .then(() => {
    console.log('Database ricostruito con successo!');
  })
  .catch(err => console.error('Errore:', err));
  

// --- API ROUTES ---

// 1. OTTENERE FACOLTÀ E CORSI (Per il tuo frontend)
app.get('/api/auth/faculties', async (req, res) => {
    try {
        const faculties = await Faculty.findAll({ include: [Course] });
        res.json(faculties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. REGISTRAZIONE (Usando Sequelize invece di db.run)
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

app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});