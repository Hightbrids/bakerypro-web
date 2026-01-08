// routes/actions.js
const router = require('express').Router();
const { sql, query, proc } = require('../db');

// Produce UI
router.get('/produce', async (req, res) => {
  const prods = await query('SELECT ProductId, ProductName FROM Product ORDER BY ProductName');
  res.render('actions/produce', { prods: prods.recordset, result: null, details: [] });
});

// Produce action -> Add_Product
router.post('/produce', async (req, res) => {
  const { ProductId, Quantity, ProducedDate } = req.body;
  const prods = await query('SELECT ProductId, ProductName FROM Product ORDER BY ProductName');
  const rs = await proc('Add_Product', [
    { name:'ProductId', type: sql.Int, value: ProductId },
    { name:'Quantity', type: sql.Int, value: Quantity },
    { name:'ProducedDate', type: sql.Date, value: ProducedDate }
  ]);
  // Stored proc returns one or two recordsets (status; optional shortage list)
  const result = rs.recordsets[0]?.[0] || null;
  const details = rs.recordsets[1] || [];
  res.render('actions/produce', { prods: prods.recordset, result, details });
});

// Refill UI
router.get('/refill', async (req, res) => {
  const ing = await query('SELECT IngredientId, IngredientName FROM Ingredient ORDER BY IngredientName');
  res.render('actions/refill', { ing: ing.recordset, result: null });
});

// Refill action -> RefillIngredient
router.post('/refill', async (req, res) => {
  const { IngredientId, Qty, CreatedAt } = req.body;
  const ing = await query('SELECT IngredientId, IngredientName FROM Ingredient ORDER BY IngredientName');
  const rs = await proc('RefillIngredient', [
    { name:'IngredientId', type: sql.Int, value: IngredientId },
    { name:'Qty', type: sql.Decimal(10,2), value: Qty },
    { name:'CreatedAt', type: sql.Date, value: CreatedAt }
  ]);
  const result = rs.recordsets[0]?.[0] || null;
  res.render('actions/refill', { ing: ing.recordset, result });
});

module.exports = router;
