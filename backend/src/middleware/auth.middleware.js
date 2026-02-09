const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Prende il token dall'header (formato: "Bearer TOKEN")
        const token = req.headers.authorization.split(' ')[1];
        
        // Verifica il token usando la chiave segreta nel tuo .env
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // Aggiunge i dati dell'utente alla richiesta per usarli nei controller
        req.userData = { userId: decodedToken.userId, email: decodedToken.email };
        
        next(); // Passa al prossimo passaggio (il controller)
    } catch (error) {
        return res.status(401).json({
            message: 'Autenticazione fallita: Token non valido o mancante'
        });
    }
};