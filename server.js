const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// AI text simplification endpoint
app.post('/api/simplify', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt || `Please simplify the following text to make it easier to understand, using simpler words and shorter sentences while keeping the original meaning: "${text}"`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const simplifiedText = response.data.candidates[0].content.parts[0].text;
    res.json({ simplifiedText });
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to simplify text. Please check your API key and try again.' 
    });
  }
});

// AI image generation endpoint (using text description)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Based on this text, create a detailed description for an image that would help visualize and understand the concept: "${text}". Provide a clear, descriptive prompt for image generation.`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const imageDescription = response.data.candidates[0].content.parts[0].text;
    res.json({ imageDescription });
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate image description. Please check your API key and try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader server running on http://localhost:${PORT}`);
  console.log('📚 Available features:');
  console.log('  - PDF viewing with zoom and navigation');
  console.log('  - AI text simplification');
  console.log('  - AI image generation for concepts');
  console.log('  - Accessibility controls (font size, brightness)');
  console.log('  - Text selection and highlighting');
});
