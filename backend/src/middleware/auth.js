const jwt = require('jsonwebtoken');
const { get } = require('../db/connection');
const { buildAccountAccess } = require('../utils/account-role');

// middleware di autenticazione: va messo su tutte le route protette.
// legge il token JWT dall'header Authorization, lo verifica e inietta req.userData
// così i controller sanno chi sta facendo la richiesta senza dover rifare il controllo
module.exports = async (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');

    // il formato corretto è "Bearer <token>"
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'token mancante' });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, secret); // lancia un'eccezione se il token è scaduto o falso

    // supporto per entrambi i formati del payload (userId e id per retrocompatibilità)
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'token non valido' });
    }

    // verifica che l'utente esista ancora nel db (potrebbe essere stato eliminato)
    const user = await get(
      `select email, accountRole
       from Users
       where id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(401).json({ message: 'token non valido' });
    }

    // aggiunge i dati utente alla request, disponibili in tutti i controller successivi
    req.userData = {
      userId,
      email: user.email || decoded.email || null,
      ...buildAccountAccess(user.accountRole),
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'autenticazione fallita' });
  }
};
