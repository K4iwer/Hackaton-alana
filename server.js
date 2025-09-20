const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

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

// Helper to call Gemini
async function callGeminiGenerateContent(userText) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }]
      }
    ]
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data.candidates[0].content.parts[0].text;
}

// Initialize Gemini AI
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI text simplification endpoint
app.post('/api/simplify', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Use custom prompt if provided, otherwise use default simplification prompt
    const finalPrompt = prompt || `Simplifique o seguinte texto em português de forma clara e objetiva, mantendo o significado original: ${text}`;
    
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const simplifiedText = response.text();

    res.json({ simplifiedText });
  } catch (error) {
    console.error('Error simplifying text:', error);
    res.status(500).json({ error: 'Failed to simplify text' });
  }
});

// Summarize text endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Faça um resumo detalhado e explicativo do seguinte texto em português. 
    Inclua os pontos principais, conceitos importantes e explique o contexto quando necessário. 
    O resumo deve ser informativo e educativo:

    ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (error) {
    console.error('Error summarizing text:', error);
    res.status(500).json({ error: 'Failed to summarize text' });
  }
});

// Dictionary lookup endpoint
app.post('/api/dictionary', async (req, res) => {
  try {
    const { word } = req.body;
    
    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Atue como um dicionário completo em português. Para a palavra ou expressão "${word}", forneça:

    1. **Definição**: Significado claro e preciso
    2. **Classe gramatical**: (substantivo, verbo, adjetivo, etc.)
    3. **Sinônimos**: Palavras com significado similar
    4. **Antônimos**: Palavras com significado oposto (se aplicável)
    5. **Exemplo de uso**: Uma frase demonstrando o uso correto
    6. **Etimologia**: Origem da palavra (se relevante)

    Formate a resposta de forma clara e organizada em português.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const definition = response.text();

    res.json({ definition });
  } catch (error) {
    console.error('Error looking up dictionary:', error);
    res.status(500).json({ error: 'Failed to lookup dictionary' });
  }
});

// AI image generation endpoint (using Pollinations AI - free API)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { text } = req.body;
    
    // First, use Gemini to create a good image prompt from the text
    let imagePrompt = text;
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const promptEnhancement = `Create a detailed, visual image prompt in English that would help illustrate the following concept for educational purposes. Focus on concrete visual elements, setting, and style. Keep it concise but descriptive, maximum 150 characters. Text: "${text}"`;
        imagePrompt = await callGeminiGenerateContent(promptEnhancement);
        // Clean up the prompt - remove quotes and extra text
        imagePrompt = imagePrompt.replace(/["""]/g, '').trim();
        // Ensure prompt doesn't get cut off mid-word
        if (imagePrompt.length > 150) {
          const words = imagePrompt.substring(0, 150).split(' ');
          words.pop(); // Remove last potentially incomplete word
          imagePrompt = words.join(' ');
        }
      } catch (error) {
        console.log('Using original text as prompt since Gemini failed:', error.message);
        // Fallback to original text if Gemini fails
        imagePrompt = text.substring(0, 200);
      }
    }
    
    // Generate image using Pollinations AI (free API)
    const encodedPrompt = encodeURIComponent(imagePrompt);
    
    // Use the most reliable Pollinations endpoint
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
    
    console.log('Generated image URL:', imageUrl);
    console.log('Using prompt:', imagePrompt);
    
    // Return the URL directly - let the frontend handle loading
    res.json({ 
      imageUrl: imageUrl,
      prompt: imagePrompt,
      success: true 
    });
    
  } catch (error) {
    console.error('Error in image generation endpoint:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate image. Please try again.' 
    });
  }
});

// AI historical context endpoint
app.post('/api/historical-context', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    const userPrompt = `Analise o seguinte texto e forneça o contexto histórico relevante. Explique:

1. **Período Histórico**: Em que época isso aconteceu ou se desenvolveu?
2. **Contexto Social e Político**: Qual era a situação da sociedade e política na época?
3. **Antecedentes**: O que levou a essa situação ou desenvolvimento?
4. **Consequências**: Qual foi o impacto histórico deste evento/conceito?
5. **Relevância Atual**: Por que isso ainda é importante hoje?
6. **Escola Literária**: Esse texto pertence a qual escola literária, e quais características do texto são relevantes para essa escola?

Texto para análise:
"""
${text}
"""

Forneça uma explicação clara, didática e bem estruturada em português brasileiro.`;

    const historicalContext = await callGeminiGenerateContent(userPrompt);
    res.json({ historicalContext });
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const apiMsg = error.response?.data?.error?.message;
    res.status(status).json({ 
      error: apiMsg || 'Failed to generate historical context. Please check your API key and try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader server running on http://localhost:${PORT}`);
  console.log('📚 Available features:');
  console.log('  - PDF viewing with zoom and navigation');
  console.log('  - AI text simplification');
  console.log('  - AI image generation for concepts');
  console.log('  - AI historical context analysis');
  console.log('  - Accessibility controls (font size, brightness)');
  console.log('  - Text selection and highlighting');
});
