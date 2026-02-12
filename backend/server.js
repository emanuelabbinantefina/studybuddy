require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

// qui avvio il server e tengo la logica dentro src/app.js
app.listen(PORT, '0.0.0.0', () => {
  console.log(`server attivo su http://localhost:${PORT}`);
});
