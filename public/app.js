// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class AIPDFReader {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1.0;
        this.selectedText = '';
        this.fontSize = 100;
        this.brightness = 100;
        // Search state
        this.searchQuery = '';
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAvailablePDFs();
        this.checkForSelectedBook();
    }

    initializeElements() {
        // PDF elements
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.textLayer = document.getElementById('textLayer');
        this.pdfSelector = document.getElementById('pdfSelector');
        this.fileUpload = document.getElementById('fileUpload');
        
        // Control elements
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.currentPageInput = document.getElementById('currentPageInput');
        this.totalPagesSpan = document.getElementById('totalPages');
        this.zoomInBtn = document.getElementById('zoomIn');
        this.zoomOutBtn = document.getElementById('zoomOut');
        this.zoomLevelSpan = document.getElementById('zoomLevel');
        // Search elements
        this.searchInput = document.getElementById('searchInput');
        this.searchPrevBtn = document.getElementById('searchPrev');
        this.searchNextBtn = document.getElementById('searchNext');
        this.searchClearBtn = document.getElementById('searchClear');
        this.searchCountSpan = document.getElementById('searchCount');
        
        // Accessibility elements
        this.increaseFontBtn = document.getElementById('increaseFontSize');
        this.decreaseFontBtn = document.getElementById('decreaseFontSize');
        this.fontSizeDisplay = document.querySelector('.font-size-display');
        this.brightnessSlider = document.getElementById('brightnessSlider');
        
        // AI elements
        this.simplifyBtn = document.getElementById('simplifyBtn');
        this.generateImageBtn = document.getElementById('generateImageBtn');
        this.historicalContextBtn = document.getElementById('historicalContextBtn');
        this.selectedTextDisplay = document.getElementById('selectedTextDisplay');
        this.selectedTextContent = document.getElementById('selectedTextContent');
        this.clearSelectionBtn = document.getElementById('clearSelection');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendMessageBtn = document.getElementById('sendMessage');
        // Enable chat by default (chat can work with or without selection)
        if (this.chatInput) this.chatInput.disabled = false;
        if (this.sendMessageBtn) this.sendMessageBtn.disabled = false;
        
        // Loading elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.initialMessage = document.getElementById('loadingMessage');
    }

    setupEventListeners() {
        // PDF controls
        this.pdfSelector.addEventListener('change', (e) => this.loadSelectedPDF(e.target.value));
        this.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        this.prevPageBtn.addEventListener('click', () => this.previousPage());
        this.nextPageBtn.addEventListener('click', () => this.nextPage());
        this.currentPageInput.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));
        this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        
        // Search controls
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.runSearch());
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.goToMatch(1);
                }
            });
        }
        if (this.searchPrevBtn) this.searchPrevBtn.addEventListener('click', () => this.goToMatch(-1));
        if (this.searchNextBtn) this.searchNextBtn.addEventListener('click', () => this.goToMatch(1));
        if (this.searchClearBtn) this.searchClearBtn.addEventListener('click', () => this.clearSearch());
        
        // Accessibility controls
        this.increaseFontBtn.addEventListener('click', () => this.changeFontSize(10));
        this.decreaseFontBtn.addEventListener('click', () => this.changeFontSize(-10));
        this.brightnessSlider.addEventListener('input', (e) => this.changeBrightness(e.target.value));
        
        // AI controls
        this.simplifyBtn.addEventListener('click', () => this.simplifySelectedText());
        this.generateImageBtn.addEventListener('click', () => this.generateImageDescription());
        this.historicalContextBtn.addEventListener('click', () => this.generateHistoricalContext());
        this.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Text selection
        document.addEventListener('mouseup', () => this.handleTextSelection());
    }

    async loadAvailablePDFs() {
        try {
            const response = await fetch('/api/pdfs');
            const pdfs = await response.json();
            
            this.pdfSelector.innerHTML = '<option value="">Selecione um PDF...</option>';
            pdfs.forEach(pdf => {
                const option = document.createElement('option');
                option.value = pdf.name;
                option.textContent = pdf.displayName;
                this.pdfSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading PDFs:', error);
            // Inform the user clearly if the server is not running
            this.addMessage('ai', '⚠️ Não consegui conectar ao servidor. Certifique-se de que ele está em execução (npm start) e acesse via http://localhost:3000, não abrindo o arquivo HTML diretamente.');
        }
    }

    async loadSelectedPDF(filename) {
        if (!filename) return;
        
        try {
            this.showLoading('Carregando PDF...');
            const url = `/pdfs/${filename}`;
            this.pdfDoc = await pdfjsLib.getDocument(url).promise;
            this.totalPagesSpan.textContent = this.pdfDoc.numPages;
            this.currentPage = 1;
            this.currentPageInput.value = 1;
            await this.renderPage();
            this.updateControls();
            this.hideLoading();
            
            // Hide the initial message and show canvas when PDF is loaded
            if (this.initialMessage) {
                this.initialMessage.style.display = 'none';
            }
            // Show the canvas
            this.canvas.style.display = 'block';
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.hideLoading();
            alert('Erro ao carregar o PDF. Verifique se o arquivo é válido.');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            alert('Por favor, selecione um arquivo PDF válido.');
            return;
        }

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            this.showLoading('Fazendo upload do PDF...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                await this.loadAvailablePDFs();
                this.pdfSelector.value = file.name;
                await this.loadSelectedPDF(file.name);
                
                // Hide the initial message and show canvas when PDF is uploaded and loaded
                if (this.initialMessage) {
                    this.initialMessage.style.display = 'none';
                }
                // Show the canvas
                this.canvas.style.display = 'block';
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Erro ao fazer upload do arquivo.');
        } finally {
            this.hideLoading();
        }
    }

    async renderPage() {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: this.scale });

        this.canvas.height = viewport.height;
        this.canvas.width = viewport.width;

        const renderContext = {
            canvasContext: this.ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Render text layer for selection
        const textContent = await page.getTextContent();
        this.renderTextLayer(textContent, viewport);
        // Re-apply search highlights after rendering the page
        this.applySearchHighlights();
    }

    renderTextLayer(textContent, viewport) {
        this.textLayer.innerHTML = '';
        this.textLayer.style.left = this.canvas.offsetLeft + 'px';
        this.textLayer.style.top = this.canvas.offsetTop + 'px';
        this.textLayer.style.height = viewport.height + 'px';
        this.textLayer.style.width = viewport.width + 'px';

        textContent.items.forEach(item => {
            const textDiv = document.createElement('span');
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const angle = Math.atan2(tx[1], tx[0]);
            const style = textContent.styles[item.fontName];
            
            if (style) {
                textDiv.style.fontFamily = style.fontFamily;
            }
            
            textDiv.style.fontSize = tx[0] + 'px';
            textDiv.style.left = tx[4] + 'px';
            textDiv.style.top = (tx[5] - tx[0]) + 'px';
            textDiv.style.transform = `rotate(${angle}rad)`;
            textDiv.textContent = item.str;
            
            this.textLayer.appendChild(textDiv);
        });
    }

    // ========== Search ==========
    runSearch() {
        const query = (this.searchInput?.value || '').trim();
        this.searchQuery = query;

        // Clear previous highlights on current text layer
        this.clearSearchHighlightsOnly();

        if (!query) {
            this.searchMatches = [];
            this.currentMatchIndex = -1;
            this.updateSearchUI();
            return;
        }

        // Apply new highlights on current page
        this.applySearchHighlights();
    }

    applySearchHighlights() {
        if (!this.searchQuery) {
            this.updateSearchUI();
            return;
        }
        const regex = new RegExp(this.escapeRegExp(this.searchQuery), 'gi');
        this.searchMatches = [];
        this.currentMatchIndex = -1;

        // Walk all text spans inside the text layer
        const spans = Array.from(this.textLayer.querySelectorAll('span'));
        for (const span of spans) {
            const text = span.textContent;
            if (!text) continue;
            if (!regex.test(text)) {
                // Reset lastIndex if used previously
                regex.lastIndex = 0;
                continue;
            }
            // Reset lastIndex before splitting
            regex.lastIndex = 0;
            const parts = text.split(new RegExp(`(${this.escapeRegExp(this.searchQuery)})`, 'gi'));
            // Rebuild span content with highlights
            span.innerHTML = '';
            for (const part of parts) {
                if (!part) continue;
                if (part.toLowerCase() === this.searchQuery.toLowerCase()) {
                    const mark = document.createElement('span');
                    mark.className = 'search-mark';
                    mark.textContent = part;
                    span.appendChild(mark);
                    this.searchMatches.push(mark);
                } else {
                    span.appendChild(document.createTextNode(part));
                }
            }
        }

        if (this.searchMatches.length > 0) {
            this.currentMatchIndex = 0;
            this.setActiveMatch(this.currentMatchIndex);
        }
        this.updateSearchUI();
    }

    clearSearch() {
        this.searchQuery = '';
        if (this.searchInput) this.searchInput.value = '';
        this.clearSearchHighlightsOnly();
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.updateSearchUI();
    }

    clearSearchHighlightsOnly() {
        // Unwrap existing search marks on current page
        const marks = Array.from(this.textLayer.querySelectorAll('.search-mark'));
        for (const mark of marks) {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        }
    }

    goToMatch(direction) {
        if (this.searchMatches.length === 0) return;
        this.currentMatchIndex = (this.currentMatchIndex + direction + this.searchMatches.length) % this.searchMatches.length;
        this.setActiveMatch(this.currentMatchIndex);
        this.scrollActiveIntoView();
        this.updateSearchUI();
    }

    setActiveMatch(index) {
        this.searchMatches.forEach((el, i) => {
            if (i === index) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    scrollActiveIntoView() {
        const el = this.searchMatches[this.currentMatchIndex];
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    updateSearchUI() {
        if (this.searchCountSpan) {
            const total = this.searchMatches.length;
            const idx = total > 0 ? (this.currentMatchIndex + 1) : 0;
            this.searchCountSpan.textContent = `${idx}/${total}`;
        }
        const hasQuery = !!this.searchQuery;
        const hasMatches = this.searchMatches.length > 0;
        if (this.searchPrevBtn) this.searchPrevBtn.disabled = !hasMatches;
        if (this.searchNextBtn) this.searchNextBtn.disabled = !hasMatches;
        if (this.searchClearBtn) this.searchClearBtn.disabled = !hasQuery;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
            this.selectedText = selectedText;
            this.selectedTextContent.textContent = selectedText;
            this.selectedTextDisplay.style.display = 'block';
            this.simplifyBtn.disabled = false;
            this.generateImageBtn.disabled = false;
            this.historicalContextBtn.disabled = false;
            this.chatInput.disabled = false;
            this.sendMessageBtn.disabled = false;
        }
    }

    clearSelection() {
        this.selectedText = '';
        this.selectedTextDisplay.style.display = 'none';
        this.simplifyBtn.disabled = true;
        this.generateImageBtn.disabled = true;
        this.historicalContextBtn.disabled = true;
        window.getSelection().removeAllRanges();
    }

    async simplifySelectedText() {
        if (!this.selectedText) return;

        try {
            this.showLoading('Simplificando texto...');
            const response = await fetch('/api/simplify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: `Simplifique o seguinte texto removido de um livro para o português de forma clara e objetiva, mantendo o significado original: ${this.selectedText}` })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('user', `Simplificar: "${this.selectedText}"`);
                this.addMessage('ai', data.simplifiedText);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error simplifying text:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao simplificar o texto. Verifique se a chave da API do Gemini está configurada no arquivo .env e reinicie o servidor.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async generateImageDescription() {
        if (!this.selectedText) return;

        try {
            this.showLoading('Gerando descrição da imagem...');
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: this.selectedText })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('user', `Gerar imagem para: "${this.selectedText}"`);
                this.addMessage('ai', `🎨 Descrição visual: ${data.imageDescription}`);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error generating image description:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao gerar a descrição da imagem. Verifique se a chave da API do Gemini está configurada no arquivo .env e reinicie o servidor.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async generateHistoricalContext() {
        if (!this.selectedText) return;

        try {
            this.showLoading('Analisando contexto histórico...');
            const response = await fetch('/api/historical-context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: this.selectedText })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('user', `Contexto histórico para: "${this.selectedText}"`);
                this.addMessage('ai', `🏛️ ${data.historicalContext}`);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error generating historical context:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao gerar o contexto histórico. Verifique se a chave da API do Gemini está configurada no arquivo .env e reinicie o servidor.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        this.chatInput.value = '';

        try {
            this.showLoading('Processando mensagem...');
            const prompt = this.selectedText 
                ? `Contexto do texto selecionado: "${this.selectedText}"\n\nPergunta do usuário: ${message}`
                : message;

            const response = await fetch('/api/simplify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: this.selectedText || message,
                    prompt: prompt
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('ai', data.simplifiedText);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Não consegui comunicar com o servidor. Inicie o servidor com "npm start" e acesse via http://localhost:3000.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se a chave da API do Gemini está configurada corretamente no arquivo .env e reinicie o servidor.');
            }
        } finally {
            this.hideLoading();
        }
    }

    addMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Navigation methods
    async previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.currentPageInput.value = this.currentPage;
            await this.renderPage();
            this.updateControls();
        }
    }

    async nextPage() {
        if (this.currentPage < this.pdfDoc.numPages) {
            this.currentPage++;
            this.currentPageInput.value = this.currentPage;
            await this.renderPage();
            this.updateControls();
        }
    }

    async goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.pdfDoc.numPages) {
            this.currentPage = pageNum;
            await this.renderPage();
            this.updateControls();
        } else {
            this.currentPageInput.value = this.currentPage;
        }
    }

    async zoomIn() {
        this.scale = Math.min(this.scale * 1.2, 3.0);
        this.zoomLevelSpan.textContent = Math.round(this.scale * 100) + '%';
        await this.renderPage();
    }

    async zoomOut() {
        this.scale = Math.max(this.scale / 1.2, 0.5);
        this.zoomLevelSpan.textContent = Math.round(this.scale * 100) + '%';
        await this.renderPage();
    }

    updateControls() {
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= this.pdfDoc.numPages;
        this.currentPageInput.max = this.pdfDoc.numPages;
    }

    // Accessibility methods
    changeFontSize(delta) {
        this.fontSize = Math.max(50, Math.min(200, this.fontSize + delta));
        this.fontSizeDisplay.textContent = this.fontSize + '%';
        document.body.style.fontSize = (this.fontSize / 100) + 'rem';
    }

    changeBrightness(value) {
        this.brightness = value;
        document.body.style.filter = `brightness(${value}%)`;
    }

    // Utility methods
    showLoading(message = 'Carregando...') {
        this.loadingOverlay.style.display = 'flex';
        this.loadingOverlay.querySelector('p').textContent = message;
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    // Check for selected book from URL parameters
    checkForSelectedBook() {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedBook = urlParams.get('book');
        
        if (selectedBook) {
            // Wait a bit for the PDF list to load, then select the book
            setTimeout(() => {
                this.pdfSelector.value = selectedBook;
                this.loadSelectedPDF(selectedBook);
            }, 500);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new AIPDFReader();
});
