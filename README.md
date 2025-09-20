# 📚 AI PDF Reader - Leitor Inteligente

Uma aplicação web moderna que combina visualização de PDF com assistência de IA para facilitar a leitura e compreensão de textos complexos.

## ✨ Funcionalidades

### 📖 Leitor de PDF Avançado
- Visualização de PDFs com zoom e navegação
- Controles de página intuitivos
- Seleção de texto diretamente no PDF
- Interface responsiva e moderna

### 🤖 Assistente IA Integrado
- **Simplificação de Texto**: Transforme textos complexos em linguagem simples
- **Geração de Descrições Visuais**: Crie descrições de imagens para facilitar o entendimento
- **Chat Inteligente**: Faça perguntas sobre o conteúdo selecionado
- **Powered by Google Gemini**: Utiliza a API do Gemini para processamento de linguagem natural

### ♿ Recursos de Acessibilidade
- Controle de tamanho da fonte (50% - 200%)
- Ajuste de brilho da tela
- Interface otimizada para leitores de tela
- Design com alto contraste

### 🎨 Interface Moderna
- Design responsivo e intuitivo
- Gradientes e animações suaves
- Tema claro e profissional
- Experiência de usuário otimizada

## 🚀 Como Usar

### Pré-requisitos
- Node.js (versão 14 ou superior)
- Chave da API do Google Gemini

### Instalação

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/Renan9590/Hackaton-alana.git
   cd Hackaton-alana
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure a API do Gemini**:
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` e adicione sua chave da API do Gemini:
   ```
   GEMINI_API_KEY=sua_chave_api_aqui
   PORT=3000
   ```

4. **Inicie o servidor**:
   ```bash
   npm start
   ```

5. **Acesse a aplicação**:
   Abra seu navegador e vá para `http://localhost:3000`

### Como Obter a Chave da API do Gemini

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada e cole no arquivo `.env`

## 📱 Como Usar a Aplicação

### 1. Carregando um PDF
- **Opção 1**: Selecione um dos PDFs já disponíveis no dropdown
- **Opção 2**: Clique em "Upload PDF" para carregar um novo arquivo

### 2. Navegando pelo PDF
- Use os botões ◀️ ▶️ para navegar entre páginas
- Digite o número da página para ir diretamente
- Use os controles de zoom 🔍 para ajustar o tamanho

### 3. Usando a IA
1. **Selecione o texto** no PDF que deseja analisar
2. **Escolha uma ação**:
   - 🗣️ **Simplificar Texto**: Para linguagem mais simples
   - 🎨 **Gerar Imagem**: Para descrição visual do conceito
   - 💬 **Chat**: Digite uma pergunta específica

### 4. Recursos de Acessibilidade
- Use os botões ➕ ➖ para ajustar o tamanho da fonte
- Ajuste o brilho com o controle deslizante ☀️

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5/CSS3**: Estrutura e estilização moderna
- **JavaScript ES6+**: Lógica da aplicação
- **PDF.js**: Renderização de PDFs no navegador
- **Font Awesome**: Ícones
- **Google Fonts**: Tipografia (Inter)

### Backend
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **Multer**: Upload de arquivos
- **Axios**: Requisições HTTP
- **dotenv**: Gerenciamento de variáveis de ambiente

### IA e APIs
- **Google Gemini API**: Processamento de linguagem natural
- **RESTful API**: Comunicação entre frontend e backend

## 📁 Estrutura do Projeto

```
Hackaton-alana/
├── public/                 # Arquivos estáticos
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos CSS
│   └── app.js            # JavaScript do frontend
├── server.js             # Servidor Express
├── package.json          # Dependências do projeto
├── .env.example         # Exemplo de configuração
├── *.pdf               # Arquivos PDF de exemplo
└── README.md           # Este arquivo
```

## 🎯 Casos de Uso

### Para Estudantes
- Simplificar textos acadêmicos complexos
- Gerar descrições visuais de conceitos abstratos
- Fazer perguntas sobre o conteúdo estudado

### Para Pessoas com Dificuldades de Leitura
- Transformar textos em linguagem mais acessível
- Ajustar fonte e brilho para melhor legibilidade
- Obter explicações visuais de conceitos

### Para Profissionais
- Analisar documentos técnicos rapidamente
- Extrair informações-chave de relatórios
- Criar resumos de documentos extensos

## 🔧 Desenvolvimento

### Scripts Disponíveis
- `npm start`: Inicia o servidor de produção
- `npm run dev`: Inicia o servidor de desenvolvimento com auto-reload

### Contribuindo
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Equipe

Desenvolvido durante o Hackathon Alana pela eqiupe coração.

## 🆘 Suporte

Se você encontrar algum problema ou tiver sugestões:

1. Verifique se a chave da API do Gemini está configurada corretamente
2. Certifique-se de que todas as dependências foram instaladas
3. Abra uma issue no GitHub para reportar bugs ou solicitar features

---

**Feito com ❤️ para tornar a leitura mais acessível e inteligente!**
