// routes/batches.js
const router = require('express').Router();
const { query } = require('../db');

router.get('/batches', async (req, res) => {
  const rs = await query(`
    SELECT pb.*, p.ProductName
    FROM ProductBatch pb JOIN Product p ON p.ProductId = pb.ProductId
    ORDER BY pb.ProductBatchId DESC
  `);
  res.render('batches/list', { rows: rs.recordset });
});

module.exports = router;
