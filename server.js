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

// Route for the main application
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Route for login page (placeholder for now)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route for library page
app.get('/library', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'library.html'));
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

// Initialize Gemini AI
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to call Gemini
async function callGeminiGenerateContent(userText) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: userText
  });
  
  return response.text;
}

// AI text simplification endpoint
app.post('/api/simplify', async (req, res) => {
  try {
    const { text, prompt } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Use custom prompt if provided, otherwise use default simplification prompt
    const finalPrompt = prompt || `Simplifique o seguinte texto em português de forma clara e objetiva, mantendo o significado original. O texto foi removido de um livro, e sua resposta deve conter apenas o texto simplificado: ${text}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: finalPrompt
    });
    const simplifiedText = response.text;

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

    const promptText = `Faça um resumo claro e objetivo do seguinte texto em português. 
    Identifique e explique os pontos principais, conceitos-chave e ideias centrais do texto.
    Mantenha o foco no conteúdo do texto, não no contexto histórico.
    O resumo deve ser informativo e didático:

    ${text}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: promptText
    });
    const summary = response.text;

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

    const promptText = `Atue como um dicionário completo em português. Para a palavra ou expressão "${word}", forneça:

    1. **Definição**: Significado claro e preciso
    2. **Classe gramatical**: (substantivo, verbo, adjetivo, etc.)
    3. **Sinônimos**: Palavras com significado similar
    4. **Antônimos**: Palavras com significado oposto (se aplicável)
    5. **Exemplo de uso**: Uma frase demonstrando o uso correto
    6. **Etimologia**: Origem da palavra (se relevante)

    Formate a resposta de forma clara e organizada em português.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: promptText
    });
    const definition = response.text;

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

// Clean text for speech synthesis
app.post('/api/clean-text-for-speech', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    const userPrompt = `Você é um assistente especializado em preparar textos para leitura em voz alta (text-to-speech).

Seu trabalho é limpar e corrigir o seguinte texto extraído de um PDF, que pode conter:
- Números de páginas e rodapés
- Palavras quebradas ou juntas incorretamente
- Hifenização no meio de palavras
- Caracteres especiais ou símbolos estranhos
- Espaçamento irregular

REGRAS IMPORTANTES:
1. Mantenha TODO o conteúdo significativo do texto
2. Remova APENAS números de página, rodapés e artefatos de PDF
3. Corrija palavras quebradas (ex: "desenvolvi- mento" → "desenvolvimento")
4. Adicione pontuação adequada para pausas naturais na leitura
5. NÃO resuma, NÃO parafraseie, NÃO altere o significado
6. Retorne APENAS o texto limpo, sem explicações ou comentários

Texto para limpar:
"""
${text}
"""

Texto limpo para leitura:`;

    const cleanedText = await callGeminiGenerateContent(userPrompt);
    res.json({ cleanedText });
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const apiMsg = error.response?.data?.error?.message;
    res.status(status).json({ 
      error: apiMsg || 'Failed to clean text. Please check your API key and try again.' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader server running on http://localhost:${PORT}`);
  console.log('📚 Available features:');
  console.log('  - PDF viewing with zoom and navigation');
  console.log('  - AI text simplification');
  console.log('  - AI image generation for concepts');
  console.log('  - AI text summarization');
  console.log('  - AI dictionary lookup');
  console.log('  - Text-to-speech with AI text cleaning');
  console.log('  - Accessibility controls (font size, brightness)');
  console.log('  - Multi-page text selection');
});
