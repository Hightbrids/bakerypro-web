// routes/ingredients.js
const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const { sql, query } = require('../db');
const upload = require('../upload');
const { ensureRepo, commitAdd, commitRemove, toRawUrl, REPO_DIR } = require('../git');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

// List
router.get('/ingredients', async (req, res) => {
  const rs = await query(`
    SELECT i.IngredientId, i.IngredientName, i.IngredientUnitName,
           i.IngredientStockQty, i.IngredientReorderPoint, i.ImgIngredient,
           dbo.IsLowStock(i.IngredientId) AS IsLow
    FROM Ingredient i
    ORDER BY i.IngredientId
  `);
  res.render('ingredients/list', { rows: rs.recordset });
});

// New
router.get('/ingredients/new', (req, res) => res.render('ingredients/form', { row:{}, mode:'create' }));

// Create
router.post('/ingredients', upload.single('ImgIngredientFile'), async (req, res) => {
  const { IngredientName, IngredientUnitName, IngredientStockQty, IngredientReorderPoint } = req.body;
  if (!req.file) return res.status(400).send('Image file is required.');

  const ext = mime.extension(req.file.mimetype) || 'jpg';
  const fileName = `${uuidv4()}.${ext}`;
  const relPath = path.posix.join('ingredients', fileName);
  const absPath = path.join(REPO_DIR, relPath);

  try {
    await ensureRepo();
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, req.file.buffer);
    await commitAdd(relPath, `Add ingredient image ${fileName}`);
    const imgUrl = toRawUrl(relPath);

    await query(`
      INSERT INTO Ingredient (IngredientName, IngredientUnitName, IngredientStockQty, IngredientReorderPoint, ImgIngredient)
      VALUES (@n,@u,@q,@r,@img)
    `, [
      { name:'n', type: sql.VarChar(50), value: IngredientName },
      { name:'u', type: sql.VarChar(20), value: IngredientUnitName },
      { name:'q', type: sql.Decimal(10,2), value: IngredientStockQty || 0 },
      { name:'r', type: sql.Decimal(10,2), value: IngredientReorderPoint || 0 },
      { name:'img', type: sql.VarChar(300), value: imgUrl }
    ]);

    res.redirect('/ingredients');
  } catch (e) {
    console.error(e);
    res.status(500).send('Upload failed.');
  }
});

// Edit
router.get('/ingredients/:id/edit', async (req, res) => {
  const rs = await query('SELECT * FROM Ingredient WHERE IngredientId=@id', [
    { name:'id', type: sql.Int, value: req.params.id }
  ]);
  res.render('ingredients/form', { row: rs.recordset[0], mode:'edit' });
});

// Update: replace image if provided
router.put('/ingredients/:id', upload.single('ImgIngredientFile'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { IngredientName, IngredientUnitName, IngredientStockQty, IngredientReorderPoint } = req.body;

  const cur = await query('SELECT ImgIngredient FROM Ingredient WHERE IngredientId=@id', [
    { name:'id', type: sql.Int, value: id }
  ]);
  let imgUrl = cur.recordset[0]?.ImgIngredient;

  try {
    if (req.file) {
      if (imgUrl) {
        const relOld = imgUrl.split('/').slice(7).join('/');
        await commitRemove(relOld, `Remove ingredient old image ${relOld}`);
      }
      const ext = mime.extension(req.file.mimetype) || 'jpg';
      const fileName = `${uuidv4()}.${ext}`;
      const relPath = path.posix.join('ingredients', fileName);
      const absPath = path.join(REPO_DIR, relPath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, req.file.buffer);
      await commitAdd(relPath, `Add ingredient image ${fileName}`);
      imgUrl = toRawUrl(relPath);
    }

    await query(`
      UPDATE Ingredient
         SET IngredientName=@n, IngredientUnitName=@u,
             IngredientStockQty=@q, IngredientReorderPoint=@r,
             ImgIngredient=@img
       WHERE IngredientId=@id
    `, [
      { name:'n', type: sql.VarChar(50), value: IngredientName },
      { name:'u', type: sql.VarChar(20), value: IngredientUnitName },
      { name:'q', type: sql.Decimal(10,2), value: IngredientStockQty },
      { name:'r', type: sql.Decimal(10,2), value: IngredientReorderPoint },
      { name:'img', type: sql.VarChar(300), value: imgUrl },
      { name:'id', type: sql.Int, value: id }
    ]);

    res.redirect('/ingredients');
  } catch (e) {
    console.error(e);
    res.status(500).send('Update failed.');
  }
});

// Delete + remove image + cascade delete Recipe (manual)
router.delete('/ingredients/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    // 1) ดึง URL รูปเก่า (ไว้ลบออกจาก repo)
    const cur = await query('SELECT ImgIngredient FROM Ingredient WHERE IngredientId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);
    const imgUrl = cur.recordset[0]?.ImgIngredient;

    // 2) ลบสูตรที่อ้างวัตถุดิบนี้ก่อน
    await query('DELETE FROM Recipe WHERE IngredientId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);

    // 3) ลบวัตถุดิบ
    await query('DELETE FROM Ingredient WHERE IngredientId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);

    // 4) ลบรูปจาก repo (ถ้ามี)
    try {
      if (imgUrl) {
        const relOld = imgUrl.split('/').slice(7).join('/'); // path ใน repo
        await commitRemove(relOld, `Remove ingredient image ${relOld}`);
      }
    } catch (e) {
      console.warn('Image remove warning:', e.message);
    }

    res.redirect('/ingredients');
  } catch (e) {
    if (e.number === 547) {
      // FK ป้องกันอยู่ (เผื่อกรณีอื่น) — แจ้งเตือนแบบสวยงาม
      return res.status(400).send('Cannot delete: this ingredient is used in recipes.');
    }
    console.error(e);
    res.status(500).send('Delete failed.');
  }
});


module.exports = router;
