# 🚀 Instruções Rápidas - AI PDF Reader

## ⚡ Início Rápido

### 1. Instalar Node.js (se não tiver)
1. Acesse: https://nodejs.org/
2. Baixe a versão LTS (recomendada)
3. Execute o instalador
4. Reinicie o terminal/prompt de comando

### 2. Configurar o Projeto
```bash
# Opção 1: Execute o script automático
setup.bat

# Opção 2: Comandos manuais
npm install
copy .env.example .env
```

### 3. Configurar API da OpenAI
1. Acesse: https://platform.openai.com/api-keys
2. Faça login com sua conta OpenAI
3. Crie uma API key
4. Copie a chave gerada
5. Edite o arquivo `.env` e adicione:
   ```
   OPENAI_API_KEY=sua_chave_api_aqui
   OPENAI_MODEL=gpt-4o-mini
   PORT=3000
   ```

### 4. Iniciar a Aplicação
```bash
# Opção 1: Script automático
start.bat

# Opção 2: Comando manual
npm start
```

### 5. Acessar a Aplicação
Abra seu navegador e vá para: **http://localhost:3000**

## 📚 Como Usar

### Carregando PDFs
- **PDFs Existentes**: Use o dropdown para selecionar um dos PDFs já disponíveis
- **Novo PDF**: Clique em "Upload PDF" para carregar seu próprio arquivo

### Usando a IA
1. **Selecione texto** no PDF (clique e arraste)
2. **Escolha uma ação**:
   - 🗣️ **Simplificar Texto**: Transforma em linguagem mais simples
   - 🎨 **Gerar Imagem**: Cria descrição visual do conceito
   - 💬 **Chat**: Digite perguntas sobre o texto selecionado

### Recursos de Acessibilidade
- **Fonte**: Use ➕ ➖ para ajustar o tamanho
- **Brilho**: Ajuste com o controle deslizante ☀️
- **Zoom**: Use os controles de zoom no PDF

## 🛠️ Solução de Problemas

### Erro: "npm não é reconhecido"
- **Solução**: Instale o Node.js do site oficial

### Erro: "Failed to simplify text"
- **Causa**: Chave da API não configurada ou inválida
- **Solução**: Verifique o arquivo `.env` e sua chave da OpenAI (OPENAI_API_KEY)

### PDF não carrega
- **Causa**: Arquivo pode estar corrompido
- **Solução**: Tente outro arquivo PDF

### Servidor não inicia
- **Causa**: Porta 3000 pode estar em uso
- **Solução**: Mude a porta no arquivo `.env` (ex: PORT=3001)

## 📞 Suporte

Se encontrar problemas:
1. Verifique se seguiu todos os passos
2. Consulte o arquivo `README.md` para informações detalhadas
3. Abra uma issue no GitHub

---
**Desenvolvido com ❤️ para o Hackathon Alana**
