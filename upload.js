// upload.js
const multer = require('multer');
const storage = multer.memoryStorage(); // เก็บในหน่วยความจำแล้วเขียนไฟล์เอง
const upload = multer({ storage });
module.exports = upload;
