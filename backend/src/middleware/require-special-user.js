module.exports = (req, res, next) => {
  // Da usare dopo auth: controlla il flag calcolato in req.userData per funzioni riservate a BuddyPro.
  if (req.userData?.isSpecialUser) {
    return next();
  }

  return res.status(403).json({
    message: 'funzionalita riservata agli utenti BuddyPro',
  });
};
