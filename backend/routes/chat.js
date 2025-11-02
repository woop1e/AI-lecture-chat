const express = require('express');
const path = require('path');
const fs = require('fs');
const { queryOllama } = require('../services/ollamaService');

const router = express.Router();

const HISTORY_DIR = path.join(__dirname, '../../processing/history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'chat_sessions.json');

if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify({ sessions: [] }, null, 2));
}

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (error) {
    return { sessions: [] };
  }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function createSession(videoName) {
  return {
    id: Date.now().toString(),
    videoName: videoName || 'lecture.mp4',
    createdAt: new Date().toISOString(),
    chats: []
  };
}

router.post('/', async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const dataPath = path.join(__dirname, '../../processing/output/final_combined.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ 
        error: 'Lecture data not found. Please process a video first.' 
      });
    }

    const lectureData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const context = buildContext(lectureData);

    const answer = await queryOllama(question, context);

    const history = loadHistory();
    let session = history.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      session = createSession();
      history.sessions.push(session);
    }

    session.chats.push({
      timestamp: new Date().toISOString(),
      question,
      answer
    });

    if (history.sessions.length > 50) {
      history.sessions = history.sessions.slice(-50);
    }

    saveHistory(history);

    res.json({
      success: true,
      question,
      answer,
      sessionId: session.id,
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

router.get('/history', (req, res) => {
  try {
    const history = loadHistory();
    res.json({
      success: true,
      sessions: history.sessions.reverse() 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = loadHistory();
    const session = history.sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = loadHistory();
    history.sessions = history.sessions.filter(s => s.id !== sessionId);
    saveHistory(history);

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all history
router.delete('/history', (req, res) => {
  try {
    saveHistory({ sessions: [] });
    res.json({
      success: true,
      message: 'All history cleared'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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