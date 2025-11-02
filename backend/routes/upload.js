const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Helper function to clean directories recursively
function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        // Recursively clean subdirectories
        cleanDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../processing/input');
    
    // CRITICAL: Clean input directory before accepting new upload
    if (fs.existsSync(uploadDir)) {
      cleanDirectory(uploadDir);
    }
    
    // Recreate input directory
    fs.mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Always save as lecture.mp4 (overwrite previous)
    cb(null, 'lecture.mp4');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm|flv|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname || file.mimetype.startsWith('video/')) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Upload video endpoint with COMPLETE cleanup
router.post('/', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    // CRITICAL: Clean output directory for fresh processing
    const outputDir = path.join(__dirname, '../../processing/output');
    cleanDirectory(outputDir);
    
    // Recreate output directory structure
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.join(outputDir, 'frames'), { recursive: true });

    console.log('✓ Previous video and output cleaned');
    console.log('✓ New video saved as lecture.mp4');
    console.log('✓ Output directory ready for processing');

    res.json({
      success: true,
      message: 'Video uploaded successfully. Previous data cleaned.',
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    });
  } catch (error) {
    console.error('Upload error:', error);
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

// Delete current video (optional cleanup endpoint)
router.delete('/current', (req, res) => {
  try {
    const inputDir = path.join(__dirname, '../../processing/input');
    const outputDir = path.join(__dirname, '../../processing/output');
    
    cleanDirectory(inputDir);
    cleanDirectory(outputDir);
    
    // Recreate directories
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    
    res.json({
      success: true,
      message: 'All processing data cleaned'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;