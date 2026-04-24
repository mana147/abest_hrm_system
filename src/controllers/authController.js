const bcrypt    = require('bcryptjs');
const userModel = require('../models/userModel');

module.exports = {
  showLogin(req, res) {
    if (req.session.user) return res.redirect('/');
    res.render('auth/login', { layout: false, title: req.t('auth.login') });
  },

  async login(req, res) {
    const { username, password } = req.body;
    try {
      const user = await userModel.findByUsername(username);

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        req.flash('error', req.t('auth.invalid_credentials'));
        return res.redirect('/auth/login');
      }
      if (user.status !== 'active') {
        req.flash('error', req.t('auth.account_inactive'));
        return res.redirect('/auth/login');
      }

      req.session.user = {
        id:       user.id,
        username: user.username,
        fullName: user.full_name,
        role:     user.role_name,
        roleId:   user.role_id,
      };
      req.session.lang = user.lang_preference || 'vi';

      res.redirect('/dashboard');
    } catch (err) {
      console.error('[login]', err);
      req.flash('error', 'Server error. Please try again.');
      res.redirect('/auth/login');
    }
  },

  logout(req, res) {
    req.session.destroy(() => res.redirect('/auth/login'));
  },
};