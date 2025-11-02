const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama2';

/**
 * Query Ollama with a question and context
 * @param {string} question - User's question
 * @param {string} context - Lecture context
 * @returns {Promise<string>} - AI response
 */
async function queryOllama(question, context) {
  try {
    const prompt = buildPrompt(question, context);

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 500
      }
    });

    if (response.data && response.data.response) {
      return response.data.response.trim();
    }

    throw new Error('Invalid response from Ollama');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure Ollama is running on http://localhost:11434');
    }
    throw error;
  }
}

/**
 * Build a prompt with context and question
 */
function buildPrompt(question, context) {
  return `You are an AI teaching assistant helping students understand lecture content.

${context}

INSTRUCTIONS:
- Answer the student's question based ONLY on the lecture content above
- Be clear, concise, and educational
- If the answer is not in the lecture content, say "I don't have that information in this lecture"
- Include relevant timestamps when applicable
- Use simple language that students can understand

STUDENT QUESTION: ${question}

ANSWER:`;
}

/**
 * Check if Ollama is running
 */
async function checkOllamaConnection() {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000
    });
    return {
      connected: true,
      models: response.data.models || []
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Stream response from Ollama (for real-time responses)
 */
async function streamOllama(question, context, onChunk) {
  try {
    const prompt = buildPrompt(question, context);

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: MODEL,
      prompt: prompt,
      stream: true
    }, {
      responseType: 'stream'
    });

    let fullResponse = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullResponse += parsed.response;
            onChunk(parsed.response);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', () => resolve(fullResponse));
      response.data.on('error', reject);
    });

  } catch (error) {
    throw error;
  }
}

module.exports = {
  queryOllama,
  checkOllamaConnection,
  streamOllama
};