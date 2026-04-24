require('dotenv').config();

const express      = require('express');
const session      = require('express-session');
const MySQLStore   = require('express-mysql-session')(session);
const flash        = require('connect-flash');
const helmet       = require('helmet');
const morgan       = require('morgan');
const ejsLayouts   = require('express-ejs-layouts');
const path         = require('path');

const i18nMiddleware = require('./middleware/i18n');
const routes         = require('./routes/index');

const app = express();

// ── Session store (MySQL) ──────────────────────────────────
const sessionStore = new MySQLStore({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  clearExpired:       true,
  expiration:         parseInt(process.env.SESSION_EXPIRE) || 86400000,
  createDatabaseTable: true,
});

// ── Middleware ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  key:               'hrm_sid',
  secret:            process.env.SESSION_SECRET || 'hrm-secret',
  store:             sessionStore,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   parseInt(process.env.SESSION_EXPIRE) || 86400000,
  },
}));

app.use(flash());

// ── View engine ────────────────────────────────────────────
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout/main');

// ── Global locals ──────────────────────────────────────────
app.use(i18nMiddleware);
app.use((req, res, next) => {
  res.locals.user    = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.page    = '';
  next();
});

// ── Routes ─────────────────────────────────────────────────
app.use('/', routes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', { layout: false, code: 404, message: 'Page not found' });
});

// ── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { layout: false, code: 500, message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HRM System → http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
