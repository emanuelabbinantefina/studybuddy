module.exports = (req, res, next) => {
  if (req.userData?.isSpecialUser) {
    return next();
  }

  return res.status(403).json({
    message: 'funzionalita riservata agli utenti BuddyPro',
  });
};
