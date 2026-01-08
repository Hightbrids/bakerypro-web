// routes/recipes.js
const router = require('express').Router();
const { sql, query } = require('../db');

// list by product
router.get('/recipes', async (req, res) => {
  const prods = await query('SELECT ProductId, ProductName FROM Product ORDER BY ProductName');
  const productId = req.query.productId || (prods.recordset[0]?.ProductId || 0);
  let rows = [];
  if (productId) {
    const rs = await query(`
      SELECT r.RecipeId, r.ProductId, r.IngredientId, r.QtyPerUnit,
             i.IngredientName, i.IngredientUnitName
      FROM Recipe r JOIN Ingredient i ON i.IngredientId = r.IngredientId
      WHERE r.ProductId=@pid
      ORDER BY r.RecipeId
    `, [{ name:'pid', type: sql.Int, value: productId }]);
    rows = rs.recordset;
  }
  const ing = await query('SELECT IngredientId, IngredientName FROM Ingredient ORDER BY IngredientName');
  res.render('recipes/list', { rows, prods: prods.recordset, ing: ing.recordset, productId });
});

// add an ingredient line
router.post('/recipes', async (req, res) => {
  const { ProductId, IngredientId, QtyPerUnit } = req.body;
  await query(`
    INSERT INTO Recipe (ProductId, IngredientId, QtyPerUnit)
    VALUES (@p,@i,@q)
  `, [
    { name:'p', type: sql.Int, value: ProductId },
    { name:'i', type: sql.Int, value: IngredientId },
    { name:'q', type: sql.Decimal(10,2), value: QtyPerUnit }
  ]);
  res.redirect(`/recipes?productId=${ProductId}`);
});

// delete line
router.post('/recipes/:id/delete', async (req, res) => {
  const { productId } = req.body;
  await query('DELETE FROM Recipe WHERE RecipeId=@id', [
    { name:'id', type: sql.Int, value: req.params.id }
  ]);
  res.redirect(`/recipes?productId=${productId}`);
});

module.exports = router;
