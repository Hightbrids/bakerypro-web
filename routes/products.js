// routes/products.js
const path = require('path');
const fs = require('fs');
const router = require('express').Router();
const { sql, query } = require('../db');
const upload = require('../upload');
const { ensureRepo, commitAdd, commitRemove, toRawUrl, REPO_DIR } = require('../git');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

// List
router.get('/products', async (req, res) => {
  const rs = await query(`
    SELECT p.ProductId, p.ProductName, p.CategoryId, p.ShelfLifeDays, p.UnitPrice,
           p.ProductReorderPoint, p.ImgProduct, c.CategoryName
    FROM Product p JOIN Categories c ON c.CategoryId = p.CategoryId
    ORDER BY p.ProductId
  `);
  res.render('products/list', { rows: rs.recordset });
});

// New
router.get('/products/new', async (req, res) => {
  const cats = await query('SELECT CategoryId, CategoryName FROM Categories ORDER BY CategoryName');
  res.render('products/form', { row: {}, cats: cats.recordset, mode: 'create' });
});

// Create (with image upload)
router.post('/products', upload.single('ImgProductFile'), async (req, res) => {
  const { ProductName, CategoryId, ShelfLifeDays, UnitPrice, ProductReorderPoint } = req.body;

  // ต้องมีรูป (คอลัมน์ NOT NULL)
  if (!req.file) {
    return res.status(400).send('Image file is required.');
  }

  // สร้างชื่อไฟล์ unique
  const ext = mime.extension(req.file.mimetype) || 'jpg';
  const fileName = `${uuidv4()}.${ext}`;
  const relPath = path.posix.join('products', fileName); // path ภายใน repo
  const absPath = path.join(REPO_DIR, relPath);

  try {
    await ensureRepo();
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, req.file.buffer);
    await commitAdd(relPath, `Add product image ${fileName}`);

    const imgUrl = toRawUrl(relPath);

    await query(`
      INSERT INTO Product (ProductName, CategoryId, ShelfLifeDays, UnitPrice, ProductReorderPoint, ImgProduct)
      VALUES (@n, @c, @s, @u, @r, @img)
    `, [
      { name: 'n', type: sql.VarChar(50), value: ProductName },
      { name: 'c', type: sql.Int, value: CategoryId },
      { name: 's', type: sql.Int, value: ShelfLifeDays },
      { name: 'u', type: sql.Decimal(10,2), value: UnitPrice || 0 },
      { name: 'r', type: sql.Int, value: ProductReorderPoint },
      { name: 'img', type: sql.VarChar(300), value: imgUrl }
    ]);

    res.redirect('/products');
  } catch (e) {
    console.error(e);
    return res.status(500).send('Upload failed.');
  }
});

// Edit form
router.get('/products/:id/edit', async (req, res) => {
  const cats = await query('SELECT CategoryId, CategoryName FROM Categories ORDER BY CategoryName');
  const rs = await query('SELECT * FROM Product WHERE ProductId=@id', [
    { name:'id', type: sql.Int, value: req.params.id }
  ]);
  res.render('products/form', { row: rs.recordset[0], cats: cats.recordset, mode:'edit' });
});

// Update: optional image replace
router.put('/products/:id', upload.single('ImgProductFile'), async (req, res) => {
  const { ProductName, CategoryId, ShelfLifeDays, UnitPrice, ProductReorderPoint } = req.body;
  const id = parseInt(req.params.id, 10);

  // อ่าน URL เดิม (ไว้ใช้ลบ)
  const cur = await query('SELECT ImgProduct FROM Product WHERE ProductId=@id', [
    { name:'id', type: sql.Int, value: id }
  ]);
  let imgUrl = cur.recordset[0]?.ImgProduct;

  try {
    if (req.file) {
      // ลบไฟล์เก่าถ้ามี
      if (imgUrl) {
        const relOld = imgUrl.split('/').slice(7).join('/'); // raw.githubusercontent.com/<4> => index 7 เป็น path
        const absOld = path.join(REPO_DIR, relOld);
        if (fs.existsSync(absOld)) {
          await commitRemove(relOld, `Remove product old image ${relOld}`);
        }
      }
      // เพิ่มไฟล์ใหม่
      const ext = mime.extension(req.file.mimetype) || 'jpg';
      const fileName = `${uuidv4()}.${ext}`;
      const relPath = path.posix.join('products', fileName);
      const absPath = path.join(REPO_DIR, relPath);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, req.file.buffer);
      await commitAdd(relPath, `Add product image ${fileName}`);
      imgUrl = toRawUrl(relPath);
    }

    await query(`
      UPDATE Product
         SET ProductName=@n, CategoryId=@c, ShelfLifeDays=@s,
             UnitPrice=@u, ProductReorderPoint=@r, ImgProduct=@img
       WHERE ProductId=@id
    `, [
      { name:'n', type: sql.VarChar(50), value: ProductName },
      { name:'c', type: sql.Int, value: CategoryId },
      { name:'s', type: sql.Int, value: ShelfLifeDays },
      { name:'u', type: sql.Decimal(10,2), value: UnitPrice || 0 },
      { name:'r', type: sql.Int, value: ProductReorderPoint },
      { name:'img', type: sql.VarChar(300), value: imgUrl },
      { name:'id', type: sql.Int, value: id }
    ]);

    res.redirect('/products');
  } catch (e) {
    console.error(e);
    res.status(500).send('Update failed.');
  }
});

// Delete product + cascade delete Recipe (manual) + remove image
router.delete('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    // 1) รูปเดิม
    const cur = await query('SELECT ImgProduct FROM Product WHERE ProductId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);
    const imgUrl = cur.recordset[0]?.ImgProduct;

    // 2) ลบสูตรที่อ้าง product นี้
    await query('DELETE FROM Recipe WHERE ProductId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);

    // 3) ลบ product
    await query('DELETE FROM Product WHERE ProductId=@id', [
      { name:'id', type: sql.Int, value: id }
    ]);

    // 4) ลบรูปจาก repo
    try {
      if (imgUrl) {
        const relOld = imgUrl.split('/').slice(7).join('/'); // path ใน repo
        await commitRemove(relOld, `Remove product image ${relOld}`);
      }
    } catch (e) {
      console.warn('Image remove warning:', e.message);
    }

    res.redirect('/products');
  } catch (e) {
    if (e.number === 547) {
      return res.status(400).send('Cannot delete: this product is used in recipes.');
    }
    console.error(e);
    res.status(500).send('Delete failed.');
  }
});

module.exports = router;
