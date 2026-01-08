// routes/ingredientMovements.js
const router = require('express').Router();
const { sql, query } = require('../db');

// แปลงค่าหน้า/ขนาดหน้าอย่างปลอดภัย
function toPosInt(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}
function toDateOrNull(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : s; // คืน string yyyy-mm-dd ให้ T-SQL
}

// List + filter + paginate + summary
router.get('/ingredient-movements', async (req, res) => {
  const { ingredientId, from, to, page, pageSize } = req.query;

  const p = toPosInt(page, 1);
  const ps = toPosInt(pageSize, 20);
  const offset = (p - 1) * ps;

  // dropdown วัตถุดิบ
  const ing = await query(`SELECT IngredientId, IngredientName FROM Ingredient ORDER BY IngredientName`);

  // เงื่อนไขฟิลเตอร์
  const where = [];
  const params = [];
  if (ingredientId) {
    where.push(`m.IngredientId = @ingredientId`);
    params.push({ name: 'ingredientId', type: sql.Int, value: parseInt(ingredientId, 10) });
  }
  if (toDateOrNull(from)) {
    where.push(`m.CreatedAt >= @from`);
    params.push({ name: 'from', type: sql.Date, value: from });
  }
  if (toDateOrNull(to)) {
    where.push(`m.CreatedAt <= @to`);
    params.push({ name: 'to', type: sql.Date, value: to });
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // ดึงรายการ (มีนับ total)
  const list = await query(`
    WITH Q AS (
      SELECT m.IngredientMovementId, m.IngredientId, m.MovementType, m.Qty, m.CreatedAt,
             i.IngredientName, i.IngredientUnitName
      FROM IngredientMovement m
      JOIN Ingredient i ON i.IngredientId = m.IngredientId
      ${whereSql}
    )
    SELECT *
    FROM Q
    ORDER BY CreatedAt DESC, IngredientMovementId DESC
    OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY;
    SELECT COUNT(*) AS Total FROM IngredientMovement m ${whereSql};
  `, [
    ...params,
    { name: 'off', type: sql.Int, value: offset },
    { name: 'ps',  type: sql.Int, value: ps }
  ]);

  // รวมยอด In/Out
  const sum = await query(`
    SELECT
      SUM(CASE WHEN MovementType='I' THEN Qty ELSE 0 END) AS SumIn,
      SUM(CASE WHEN MovementType='O' THEN Qty ELSE 0 END) AS SumOut
    FROM IngredientMovement m
    ${whereSql}
  `, params);

  const rows   = list.recordsets[0] || [];
  const total  = (list.recordsets[1]?.[0]?.Total) || 0;
  const pages  = Math.max(1, Math.ceil(total / ps));

  res.render('ingredientMovements/list', {
    rows,
    sums: (sum.recordset && sum.recordset[0]) || { SumIn: 0, SumOut: 0 },
    ingredients: ing.recordset || [],
    filter: { ingredientId: ingredientId || '', from: from || '', to: to || '' },
    page: p, pageSize: ps, total, pages
  });
});

// (ทางเลือก) Export CSV ตามฟิลเตอร์เดียวกัน
router.get('/ingredient-movements.csv', async (req, res) => {
  const { ingredientId, from, to } = req.query;
  const where = [];
  const params = [];
  if (ingredientId) {
    where.push(`m.IngredientId = @ingredientId`);
    params.push({ name: 'ingredientId', type: sql.Int, value: parseInt(ingredientId, 10) });
  }
  if (toDateOrNull(from)) {
    where.push(`m.CreatedAt >= @from`);
    params.push({ name: 'from', type: sql.Date, value: from });
  }
  if (toDateOrNull(to)) {
    where.push(`m.CreatedAt <= @to`);
    params.push({ name: 'to', type: sql.Date, value: to });
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rs = await query(`
    SELECT m.IngredientMovementId, m.CreatedAt, i.IngredientName,
           m.MovementType, m.Qty, i.IngredientUnitName
    FROM IngredientMovement m
    JOIN Ingredient i ON i.IngredientId = m.IngredientId
    ${whereSql}
    ORDER BY m.CreatedAt DESC, m.IngredientMovementId DESC
  `, params);

  const rows = rs.recordset || [];
  const header = 'Id,Date,Ingredient,Type,Qty,Unit\r\n';
  const body = rows.map(r =>
    [
      r.IngredientMovementId,
      (r.CreatedAt?.toISOString?.() ? r.CreatedAt.toISOString().slice(0,10) : r.CreatedAt),
      `"${(r.IngredientName||'').replace(/"/g,'""')}"`,
      r.MovementType,
      r.Qty,
      r.IngredientUnitName
    ].join(',')
  ).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ingredient-movements.csv"');
  res.send(header + body + '\r\n');
});

module.exports = router;
