module.exports = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', req.t ? req.t('auth.please_login') : 'Please login to continue');
    return res.redirect('/auth/login');
  }
  next();
};
