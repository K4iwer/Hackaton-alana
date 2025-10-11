// Importa as bibliotecas necessárias
require('dotenv').config(); // Garante que a chave do .env seja lida
const { GoogleGenerativeAI } = require("@google/genai");

// Pega a chave de API do ambiente
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("A variável API_KEY não foi encontrada no arquivo .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  console.log("Buscando a lista de modelos disponíveis para sua chave...");
  
  try {
    const result = await genAI.listModels();
    
    console.log("✅ Modelos encontrados:");
    for (const m of result.models) {
      // Vamos focar apenas nos modelos que suportam 'generateContent'
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${m.name}`);
      }
    }
  } catch (error) {
    console.error("❌ Falha ao buscar modelos:", error);
  }
}

run();