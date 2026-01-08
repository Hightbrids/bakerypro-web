// server.js
const express = require('express');
const layouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
require('dotenv').config();
const { ensureRepo } = require('./git');

const app = express();
app.set('view engine', 'ejs');
app.use(layouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));

(async () => { try { await ensureRepo(); } catch (e) { console.error('Git init error', e); } })();

app.use('/', require('./routes/categories'));
app.use('/', require('./routes/products'));
app.use('/', require('./routes/ingredients'));
app.use('/', require('./routes/recipes'));
app.use('/', require('./routes/batches'));
app.use('/', require('./routes/actions'));
app.use('/', require('./routes/ingredientMovements'));
app.use((req,res,next)=> {
  const { ok, err } = req.query;
  if (ok)  res.locals.alert = { type:'success', msg: decodeURIComponent(ok) };
  if (err) res.locals.alert = { type:'error',   msg: decodeURIComponent(err) };
  next();
});

app.get('/', (req, res) => res.render('home'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BakeryPro web running on http://localhost:${PORT}`));
