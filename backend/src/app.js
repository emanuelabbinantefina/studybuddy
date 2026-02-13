const express = require('express');
const cors = require('cors');
// IMPORTANTE: Importiamo la funzione per fare query al database
const { all } = require('./db/connection'); 

const app = express();

app.use(cors());
app.use(express.json());

// Rotta di benvenuto
app.get('/', (req, res) => {
    res.send('StudyBuddy API is running :)');
});

app.get('/faculties', async (req, res) => {
    try {
        // Interroga il database
        const faculties = await all('SELECT * FROM Faculties');
        // Manda la risposta al browser
        res.json(faculties);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Errore nel database' });
    }
});

module.exports = app;
