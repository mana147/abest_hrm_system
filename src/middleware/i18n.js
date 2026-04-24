const path = require('path');
const fs   = require('fs');

const translations = {};
['vi', 'en'].forEach(lang => {
  const filePath = path.join(__dirname, '../../locales', `${lang}.json`);
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

function translate(lang, key) {
  const keys = key.split('.');
  let val = translations[lang];
  for (const k of keys) val = val?.[k];
  return val !== undefined ? val : key;
}

module.exports = (req, res, next) => {
  const lang = req.session?.lang || 'vi';
  const t = (key) => translate(lang, key);

  res.locals.lang = lang;
  res.locals.t    = t;
  req.t           = t;   // dùng được trong controller
  next();
};
