const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const secret = process.env.JWT_SECRET || 'la_tua_chiave_super_segreta';
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'token mancante' });
    }

    const token = parts[1];
    const decoded = jwt.verify(token, secret);

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'token non valido' });
    }

    req.userData = { userId, email: decoded.email || null };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'autenticazione fallita' });
  }
};
