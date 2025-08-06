const express = require('express');
const multer = require('multer');
const { uploadCv } = require('../controllers/uploadCvController');
const { authMiddleware } = require('../utils/authMiddleware');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.post('/', authMiddleware, upload.single('resume'), uploadCv);

module.exports = router; 