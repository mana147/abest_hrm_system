// Usage: router.get('/path', requireAuth, requireRole('admin', 'operator'), handler)
module.exports = (...allowedRoles) => (req, res, next) => {
  const user = req.session.user;
  if (!user || !allowedRoles.includes(user.role)) {
    return res.status(403).render('error', {
      layout: false,
      code: 403,
      message: 'Access denied',
    });
  }
  next();
};
