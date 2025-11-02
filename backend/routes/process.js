const express = require('express');
const path = require('path');
const fs = require('fs');
const { runPythonScript } = require('../services/pythonRunner');

const router = express.Router();

// Start processing pipeline
router.post('/start', async (req, res) => {
  try {
    const processingDir = path.join(__dirname, '../../processing');
    const videoPath = path.join(processingDir, 'input/lecture.mp4');

    // Check if video exists
    if (!fs.existsSync(videoPath)) {
      return res.status(400).json({ 
        error: 'No video found. Please upload a video first.' 
      });
    }

    res.json({
      success: true,
      message: 'Processing started',
      status: 'running'
    });

    // Run processing pipeline asynchronously
    runProcessingPipeline(processingDir).catch(console.error);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
router.get('/status', (req, res) => {
  try {
    const outputDir = path.join(__dirname, '../../processing/output');
    
    const files = {
      audio: fs.existsSync(path.join(outputDir, 'audio.wav')),
      frames: fs.existsSync(path.join(outputDir, 'frames_timestamps.json')),
      transcript: fs.existsSync(path.join(outputDir, 'transcript_segments.json')),
      ocr: fs.existsSync(path.join(outputDir, 'ocr_with_timestamps.json')),
      combined: fs.existsSync(path.join(outputDir, 'final_combined.json'))
    };

    const totalSteps = Object.keys(files).length;
    const completedSteps = Object.values(files).filter(Boolean).length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    res.json({
      progress,
      completedSteps,
      totalSteps,
      files,
      isComplete: files.combined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get combined data
router.get('/data', (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../../processing/output/final_combined.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'Data not found. Please process a video first.' 
      });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Run the complete processing pipeline
async function runProcessingPipeline(processingDir) {
  console.log('🎬 Starting video processing pipeline...');

  try {
    // Step 1: Extract audio
    console.log('📢 Step 1/5: Extracting audio...');
    await runPythonScript(path.join(processingDir, 'extract_audio.py'));

    // Step 2: Extract frames
    console.log('🖼️  Step 2/5: Extracting frames...');
    await runPythonScript(path.join(processingDir, 'extract_frames.py'));

    // Step 3: Transcribe audio
    console.log('📝 Step 3/5: Transcribing audio...');
    await runPythonScript(path.join(processingDir, 'transcribe_audio.py'));

    // Step 4: OCR frames
    console.log('🔍 Step 4/5: Running OCR on frames...');
    await runPythonScript(path.join(processingDir, 'ocr_frames.py'));

    // Step 5: Combine data
    console.log('🔗 Step 5/5: Combining all data...');
    await runPythonScript(path.join(processingDir, 'combine_data.py'));

    console.log('✅ Processing pipeline completed successfully!');
  } catch (error) {
    console.error('❌ Pipeline error:', error);
    throw error;
  }
}

module.exports = router;