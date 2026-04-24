const express   = require('express');
const router    = express.Router();
const requireAuth = require('../middleware/auth');

// Language switch
router.get('/language/:lang', (req, res) => {
  const { lang } = req.params;
  if (['vi', 'en'].includes(lang)) {
    req.session.lang = lang;
    // Nếu đã login, cũng lưu vào user preference (non-blocking)
    if (req.session.user) {
      const db = require('../config/db');
      db.run('UPDATE users SET lang_preference = ? WHERE id = ?', [lang, req.session.user.id])
        .catch(err => console.error('[lang update]', err));
    }
  }
  const back = req.headers.referer || '/';
  res.redirect(back);
});

// Auth
router.use('/auth', require('./auth'));

// Students
router.use('/students', require('./students'));

// Teachers
router.use('/teachers', require('./teachers'));

// Master data
router.use('/courses',         require('./courses'));
router.use('/timeslots',       require('./timeslots'));
router.use('/classrooms',      require('./classrooms'));

// Scheduling
router.use('/schedule-lines',  require('./schedule-lines'));
router.use('/classes',         require('./classes'));

// Landing page (public)
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('landing', { layout: false, lang: req.session?.lang || 'vi' });
});

// Dashboard (protected)
router.get('/dashboard', requireAuth, async (_req, res) => {
  const db = require('../config/db');
  const [students, classes, teachers] = await Promise.all([
    db.get('SELECT COUNT(*) AS total FROM students WHERE status = "active"'),
    db.get('SELECT COUNT(*) AS total FROM classes WHERE status IN ("open_enrollment","ongoing")'),
    db.get('SELECT COUNT(*) AS total FROM teachers WHERE status = "active"'),
  ]);
  res.render('dashboard/index', {
    page:     'dashboard',
    title:    res.locals.t('dashboard.title'),
    stats: {
      students: students?.total || 0,
      classes:  classes?.total  || 0,
      teachers: teachers?.total || 0,
    },
  });
});

module.exports = router;
