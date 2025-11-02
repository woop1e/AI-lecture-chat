const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryOllama } = require('../services/ollamaService');

const router = express.Router();

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Load lecture data
    const dataPath = path.join(__dirname, '../../processing/output/final_combined.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'Lecture data not found. Please process a video first.' 
      });
    }

    const lectureData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Create context from lecture data
    const context = buildContext(lectureData);

    // Query Ollama
    const answer = await queryOllama(question, context);

    res.json({
      success: true,
      question,
      answer,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to get answer',
      message: error.message 
    });
  }
});

// Build context from lecture data
function buildContext(lectureData) {
  let context = "LECTURE CONTENT:\n\n";

  lectureData.forEach((item, index) => {
    const timestamp = formatTimestamp(item.timestamp);
    
    context += `--- Timestamp: ${timestamp} ---\n`;
    
    if (item.slide_text && item.slide_text.trim()) {
      context += `SLIDE CONTENT:\n${item.slide_text}\n\n`;
    }
    
    if (item.speech_text && item.speech_text.trim()) {
      context += `PROFESSOR SAID:\n${item.speech_text}\n\n`;
    }
    
    context += '\n';
  });

  return context;
}

// Format timestamp to MM:SS
function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get lecture summary
router.get('/summary', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../../processing/output/final_combined.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'Lecture data not found' 
      });
    }

    const lectureData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const context = buildContext(lectureData);

    const summary = await queryOllama(
      "Provide a brief summary of this lecture, including the main topics covered.",
      context
    );

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;