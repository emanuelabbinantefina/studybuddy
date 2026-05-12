const jwt = require('jsonwebtoken');
const { get } = require('../db/connection');
const { buildAccountAccess } = require('../utils/account-role');

// Middleware di autenticazione: va messo su tutte le route protette.
// Promemoria: legge "Authorization: Bearer <token>", verifica il JWT e prepara req.userData.
// Da quel momento i controller sanno gia` chi sta chiamando, senza rifare login/query inutili.
module.exports = async (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');

    // Il formato corretto e` "Bearer <token>": se manca, blocchiamo subito con 401.
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'token mancante' });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, secret); // lancia un'eccezione se il token è scaduto o falso

    // Supporto per entrambi i formati del payload (userId e id) per non rompere token vecchi.
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'token non valido' });
    }

    // Controllo extra: un token formalmente valido non basta se l'utente e` stato eliminato.
    const user = await get(
      `select email, accountRole
       from Users
       where id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(401).json({ message: 'token non valido' });
    }

    // Qui aggiungo anche i permessi derivati dal ruolo accountRole (es. BuddyPro).
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
