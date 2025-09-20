const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve PDF files
app.use('/pdfs', express.static(path.join(__dirname, '.')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get list of available PDFs
app.get('/api/pdfs', (req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.pdf'))
    .map(file => ({
      name: file,
      displayName: file.replace('.pdf', '').replace(/_/g, ' ')
    }));
  res.json(files);
});

// Upload new PDF
app.post('/api/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Helper to call OpenAI (Chat Completions)
async function callOpenAI(userText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.');
  }
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a helpful assistant focused on simplifying educational texts and creating vivid, concrete visual descriptions for learning.' },
      { role: 'user', content: userText }
    ],
    temperature: 0.3
  };
  const { data } = await axios.post(url, payload, { 
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

// AI text simplification endpoint
app.post('/api/simplify', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
      });
    }

    const userPrompt = prompt || `Rewrite the following text using simple language, short sentences, and clear vocabulary, while preserving the original meaning:
"""
${text}
"""`;

    const simplifiedText = await callOpenAI(userPrompt);
    res.json({ simplifiedText });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const apiMsg = error.response?.data?.error?.message;
    res.status(status).json({ 
      error: apiMsg || 'Failed to simplify text. Please check your OpenAI API key and try again.' 
    });
  }
});

// AI image generation endpoint (using text description)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.' 
      });
    }

    const userPrompt = `Create a clear, visual, and descriptive image prompt that would help a student understand the following concept. Focus on concrete elements, setting, composition, and style suggestions. Text:
"""
${text}
"""`;

    const imageDescription = await callOpenAI(userPrompt);
    res.json({ imageDescription });
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const apiMsg = error.response?.data?.error?.message;
    res.status(status).json({ 
      error: apiMsg || 'Failed to generate image description. Please check your OpenAI API key and try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader server running on http://localhost:${PORT}`);
  console.log('📚 Available features:');
  console.log('  - PDF viewing with zoom and navigation');
  console.log('  - AI text simplification (OpenAI)');
  console.log('  - AI image generation for concepts (OpenAI)');
  console.log('  - Accessibility controls (font size, brightness)');
  console.log('  - Text selection and highlighting');
});
