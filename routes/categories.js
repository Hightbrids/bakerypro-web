// routes/categories.js
const router = require('express').Router();
const { sql, query } = require('../db');

// List
router.get('/categories', async (req, res) => {
  const rs = await query('SELECT CategoryId, CategoryName FROM Categories ORDER BY CategoryId');
  res.render('categories/list', { rows: rs.recordset });
});

// Create form
router.get('/categories/new', (req, res) => res.render('categories/form', { row: {}, mode: 'create' }));

// Create
router.post('/categories', async (req, res) => {
  const { CategoryName } = req.body;
  await query('INSERT INTO Categories (CategoryName) VALUES (@n)', [
    { name: 'n', type: sql.VarChar(50), value: CategoryName }
  ]);
  res.redirect('/categories');
});

// Edit form
router.get('/categories/:id/edit', async (req, res) => {
  const rs = await query('SELECT * FROM Categories WHERE CategoryId=@id', [
    { name: 'id', type: sql.Int, value: req.params.id }
  ]);
  res.render('categories/form', { row: rs.recordset[0], mode: 'edit' });
});

// Update
router.put('/categories/:id', async (req, res) => {
  await query('UPDATE Categories SET CategoryName=@n WHERE CategoryId=@id', [
    { name: 'n', type: sql.VarChar(50), value: req.body.CategoryName },
    { name: 'id', type: sql.Int, value: req.params.id }
  ]);
  res.redirect('/categories');
});

// Delete
router.delete('/categories/:id', async (req, res) => {
  await query('DELETE FROM Categories WHERE CategoryId=@id', [
    { name: 'id', type: sql.Int, value: req.params.id }
  ]);
  res.redirect('/categories');
});

module.exports = router;
