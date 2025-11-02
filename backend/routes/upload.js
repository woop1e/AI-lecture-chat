const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../processing/input');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'lecture.mp4');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm|flv|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Accept if extension matches OR mimetype starts with 'video/'
    if (extname || file.mimetype.startsWith('video/')) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Upload video endpoint
router.post('/', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if video exists
router.get('/check', (req, res) => {
  const videoPath = path.join(__dirname, '../../processing/input/lecture.mp4');
  const exists = fs.existsSync(videoPath);
  
  res.json({
    exists,
    path: exists ? videoPath : null,
    size: exists ? fs.statSync(videoPath).size : 0
  });
});

module.exports = router;