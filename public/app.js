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
        // Multi-page selection state
        this.multiPageSelection = {
            isActive: false,
            startPage: null,
            endPage: null,
            startOffset: null,
            endOffset: null,
            selectedPages: new Map(), // page -> selected text
            totalText: ''
        };
        this.isExtendingSelection = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAvailablePDFs();
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
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.dictionaryBtn = document.getElementById('dictionaryBtn');
        this.historicalContextBtn = document.getElementById('historicalContextBtn');
        this.continueSelectionBtn = document.getElementById('continueSelectionBtn');
        this.selectedTextDisplay = document.getElementById('selectedTextDisplay');
        this.selectedTextContent = document.getElementById('selectedTextContent');
        this.clearSelectionBtn = document.getElementById('clearSelection');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendMessageBtn = document.getElementById('sendMessage');
        
        
        // UI elements
        this.keyboardHints = document.getElementById('keyboardHints');
        this.selectionPopup = document.getElementById('selectionPopup');
        this.popupTextPreview = document.getElementById('popupTextPreview');
        this.closePopupBtn = document.getElementById('closePopup');
        
        // Tools navigation
        this.aiToolsScroll = document.getElementById('aiToolsScroll');
        this.toolsPrevBtn = document.getElementById('toolsPrev');
        this.toolsNextBtn = document.getElementById('toolsNext');
        
        // Layout controls
        this.mainContent = document.querySelector('.main-content');
        this.pdfSection = document.getElementById('pdfSection');
        this.aiSection = document.getElementById('aiSection');
        this.resizeDivider = document.getElementById('resizeDivider');
        this.layoutPdfFocus = document.getElementById('layoutPdfFocus');
        this.layoutBalanced = document.getElementById('layoutBalanced');
        this.layoutChatFocus = document.getElementById('layoutChatFocus');
        
        
        // Popup buttons
        this.popupSimplifyBtn = document.getElementById('popupSimplifyBtn');
        this.popupGenerateImageBtn = document.getElementById('popupGenerateImageBtn');
        this.popupSummarizeBtn = document.getElementById('popupSummarizeBtn');
        this.popupDictionaryBtn = document.getElementById('popupDictionaryBtn');
        this.popupHistoricalContextBtn = document.getElementById('popupHistoricalContextBtn');
        this.popupContinueSelectionBtn = document.getElementById('popupContinueSelectionBtn');
        
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
        this.summarizeBtn.addEventListener('click', () => this.summarizeSelectedText());
        this.dictionaryBtn.addEventListener('click', () => this.lookupDictionary());
        this.continueSelectionBtn.addEventListener('click', () => this.continueSelectionOnNextPage());
        if (this.historicalContextBtn) {
            this.historicalContextBtn.addEventListener('click', () => this.generateHistoricalContext());
        }
        this.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Text selection
        document.addEventListener('mouseup', () => this.handleTextSelection());
        document.addEventListener('mousedown', (e) => this.handleSelectionStart(e));
        
        // Keyboard shortcuts for multi-page selection
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.continueSelectionOnNextPage();
            }
            if (e.key === 'Escape') {
                this.clearMultiPageSelection();
                this.hideSelectionPopup();
            }
        });
        
        // Selection popup event listeners
        this.closePopupBtn.addEventListener('click', () => this.hideSelectionPopup());
        this.popupSimplifyBtn.addEventListener('click', () => {
            this.hideSelectionPopup();
            this.simplifySelectedText();
        });
        this.popupGenerateImageBtn.addEventListener('click', () => {
            this.hideSelectionPopup();
            this.generateImageDescription();
        });
        this.popupSummarizeBtn.addEventListener('click', () => {
            this.hideSelectionPopup();
            this.summarizeSelectedText();
        });
        this.popupDictionaryBtn.addEventListener('click', () => {
            this.hideSelectionPopup();
            this.lookupDictionary();
        });
        if (this.popupHistoricalContextBtn) {
            this.popupHistoricalContextBtn.addEventListener('click', () => {
                this.hideSelectionPopup();
                this.generateHistoricalContext();
            });
        }
        this.popupContinueSelectionBtn.addEventListener('click', () => {
            this.hideSelectionPopup();
            this.continueSelectionOnNextPage();
        });
        
        // Hide popup when clicking outside
        document.addEventListener('click', (e) => {
            if (this.selectionPopup.style.display === 'block' && 
                !this.selectionPopup.contains(e.target) && 
                !window.getSelection().toString().trim()) {
                this.hideSelectionPopup();
            }
        });
        
        // Tools navigation
        this.toolsPrevBtn.addEventListener('click', () => this.scrollToolsLeft());
        this.toolsNextBtn.addEventListener('click', () => this.scrollToolsRight());
        
        // Update navigation buttons on scroll
        this.aiToolsScroll.addEventListener('scroll', () => this.updateToolsNavigation());
        
        // Initial navigation state
        this.updateToolsNavigation();
        
        // Update navigation on window resize
        window.addEventListener('resize', () => {
            setTimeout(() => this.updateToolsNavigation(), 100);
        });
        
        // Layout controls
        if (this.layoutPdfFocus) {
            this.layoutPdfFocus.addEventListener('click', () => this.setLayout('pdf-focus'));
        }
        if (this.layoutBalanced) {
            this.layoutBalanced.addEventListener('click', () => this.setLayout('balanced'));
        }
        if (this.layoutChatFocus) {
            this.layoutChatFocus.addEventListener('click', () => this.setLayout('chat-focus'));
        }
        
        // Resize divider
        this.setupResizeDivider();
        
        // Load saved layout preference
        this.loadLayoutPreference();
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
        // Restore multi-page selection highlights
        this.restoreMultiPageSelection();
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

    handleSelectionStart(e) {
        // Check if user is holding Shift to extend selection across pages
        if (e.shiftKey && this.multiPageSelection.isActive) {
            this.isExtendingSelection = true;
        }
    }

    handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
            if (this.isExtendingSelection) {
                // Extending existing multi-page selection
                this.extendMultiPageSelection(selectedText);
            } else {
                // New selection
                this.selectedText = selectedText;
                this.selectedTextContent.textContent = selectedText;
                this.selectedTextDisplay.style.display = 'block';
                this.simplifyBtn.disabled = false;
                this.generateImageBtn.disabled = false;
                this.summarizeBtn.disabled = false;
                this.dictionaryBtn.disabled = false;
                if (this.historicalContextBtn) this.historicalContextBtn.disabled = false;
                this.chatInput.disabled = false;
                this.sendMessageBtn.disabled = false;
                this.continueSelectionBtn.disabled = false;
                
                // Initialize multi-page selection
                this.initializeMultiPageSelection(selectedText);
                
                // Show selection popup
                this.showSelectionPopup(selectedText, selection);
            }
        } else {
            // No text selected, hide popup
            this.hideSelectionPopup();
        }
        
        this.isExtendingSelection = false;
    }

    initializeMultiPageSelection(selectedText) {
        this.multiPageSelection = {
            isActive: true,
            startPage: this.currentPage,
            endPage: this.currentPage,
            selectedPages: new Map(),
            totalText: selectedText
        };
        
        this.multiPageSelection.selectedPages.set(this.currentPage, selectedText);
        this.updateSelectionIndicator();
        this.showKeyboardHints();
    }

    extendMultiPageSelection(newText) {
        if (!this.multiPageSelection.isActive) return;
        
        this.multiPageSelection.endPage = this.currentPage;
        this.multiPageSelection.selectedPages.set(this.currentPage, newText);
        
        // Combine all selected text from all pages
        let combinedText = '';
        for (let page = this.multiPageSelection.startPage; page <= this.multiPageSelection.endPage; page++) {
            const pageText = this.multiPageSelection.selectedPages.get(page);
            if (pageText) {
                combinedText += (combinedText ? ' ' : '') + pageText;
            }
        }
        
        this.selectedText = combinedText;
        this.multiPageSelection.totalText = combinedText;
        this.selectedTextContent.innerHTML = combinedText;
        this.updateSelectionIndicator();
        
        // Update popup if visible
        if (this.selectionPopup.style.display === 'block') {
            this.popupTextPreview.textContent = combinedText.length > 100 ? 
                combinedText.substring(0, 100) + '...' : combinedText;
        }
    }

    continueSelectionOnNextPage() {
        if (!this.multiPageSelection.isActive || this.currentPage >= this.pdfDoc.numPages) {
            return;
        }
        
        // Go to next page and prepare for selection
        this.nextPage().then(() => {
            this.isExtendingSelection = true;
            this.showSelectionHint();
        });
    }

    restoreMultiPageSelection() {
        if (!this.multiPageSelection.isActive) return;
        
        const currentPageText = this.multiPageSelection.selectedPages.get(this.currentPage);
        if (currentPageText) {
            // Highlight the selected text on current page
            this.highlightTextOnCurrentPage(currentPageText);
            
            // Restore UI state for multi-page selection
            this.selectedText = this.multiPageSelection.totalText;
            this.selectedTextContent.innerHTML = this.multiPageSelection.totalText;
            this.selectedTextDisplay.style.display = 'block';
            this.simplifyBtn.disabled = false;
            this.generateImageBtn.disabled = false;
            if (this.historicalContextBtn) this.historicalContextBtn.disabled = false;
            this.continueSelectionBtn.disabled = false;
            this.chatInput.disabled = false;
            this.sendMessageBtn.disabled = false;
            
            // Update the selection indicator
            this.updateSelectionIndicator();
        }
    }

    highlightTextOnCurrentPage(textToHighlight) {
        // Find and highlight the text in the current text layer
        const spans = Array.from(this.textLayer.querySelectorAll('span'));
        const words = textToHighlight.split(/\s+/);
        
        let matchingSpans = [];
        let currentWordIndex = 0;
        
        for (const span of spans) {
            const spanText = span.textContent.trim();
            if (spanText && currentWordIndex < words.length) {
                if (spanText.includes(words[currentWordIndex]) || words[currentWordIndex].includes(spanText)) {
                    matchingSpans.push(span);
                    currentWordIndex++;
                }
            }
        }
        
        // Apply highlight style
        matchingSpans.forEach(span => {
            span.classList.add('multi-page-selection');
        });
    }

    updateSelectionIndicator() {
        // Update the selected text display with page information
        if (this.multiPageSelection.isActive && this.multiPageSelection.startPage !== this.multiPageSelection.endPage) {
            const pageInfo = `(Páginas ${this.multiPageSelection.startPage}-${this.multiPageSelection.endPage})`;
            this.selectedTextContent.innerHTML = `<strong>${pageInfo}</strong><br>${this.multiPageSelection.totalText}`;
        }
    }

    showSelectionHint() {
        // Show a temporary hint to the user
        const hint = document.createElement('div');
        hint.className = 'selection-hint';
        hint.innerHTML = '<i class="fas fa-hand-pointer"></i> Selecione o texto para continuar a seleção da página anterior';
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 3000);
    }

    clearSelection() {
        this.clearMultiPageSelection();
        this.selectedText = '';
        this.selectedTextDisplay.style.display = 'none';
        this.simplifyBtn.disabled = true;
        this.generateImageBtn.disabled = true;
        this.summarizeBtn.disabled = true;
        this.dictionaryBtn.disabled = true;
        this.continueSelectionBtn.disabled = true;
        if (this.historicalContextBtn) this.historicalContextBtn.disabled = true;
        this.hideKeyboardHints();
        this.hideSelectionPopup();
        window.getSelection().removeAllRanges();
    }

    clearMultiPageSelection() {
        // Clear multi-page selection highlights
        const highlights = document.querySelectorAll('.multi-page-selection');
        highlights.forEach(el => el.classList.remove('multi-page-selection'));
        
        // Reset multi-page selection state
        this.multiPageSelection = {
            isActive: false,
            startPage: null,
            endPage: null,
            selectedPages: new Map(),
            totalText: ''
        };
        
        this.isExtendingSelection = false;
    }

    showKeyboardHints() {
        if (this.keyboardHints) {
            this.keyboardHints.classList.add('show');
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.hideKeyboardHints();
            }, 5000);
        }
    }

    hideKeyboardHints() {
        if (this.keyboardHints) {
            this.keyboardHints.classList.remove('show');
        }
    }

    showSelectionPopup(selectedText, selection) {
        if (!this.selectionPopup) return;
        
        // Update popup content
        this.popupTextPreview.textContent = selectedText.length > 100 ? 
            selectedText.substring(0, 100) + '...' : selectedText;
        
        // Position popup near the selection
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const popupWidth = 320;
        const popupHeight = 200;
        
        let left = rect.left + (rect.width / 2) - (popupWidth / 2);
        let top = rect.bottom + 10;
        
        // Ensure popup stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left < 10) left = 10;
        if (left + popupWidth > viewportWidth - 10) left = viewportWidth - popupWidth - 10;
        
        if (top + popupHeight > viewportHeight - 10) {
            top = rect.top - popupHeight - 10;
        }
        
        // Show popup
        this.selectionPopup.style.left = left + 'px';
        this.selectionPopup.style.top = top + 'px';
        this.selectionPopup.style.display = 'block';
        
        // Update popup button states based on multi-page selection
        if (this.multiPageSelection.isActive && this.currentPage < this.pdfDoc?.numPages) {
            this.popupContinueSelectionBtn.style.display = 'flex';
        } else {
            this.popupContinueSelectionBtn.style.display = 'none';
        }
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (this.selectionPopup.style.display === 'block') {
                this.hideSelectionPopup();
            }
        }, 10000);
    }

    hideSelectionPopup() {
        if (this.selectionPopup) {
            this.selectionPopup.style.display = 'none';
        }
    }

    scrollToolsLeft() {
        const scrollAmount = 120;
        this.aiToolsScroll.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    }

    scrollToolsRight() {
        const scrollAmount = 120;
        this.aiToolsScroll.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    updateToolsNavigation() {
        if (!this.aiToolsScroll || !this.toolsPrevBtn || !this.toolsNextBtn) return;
        
        const scrollLeft = this.aiToolsScroll.scrollLeft;
        const scrollWidth = this.aiToolsScroll.scrollWidth;
        const clientWidth = this.aiToolsScroll.clientWidth;
        
        // Check if we can scroll left
        this.toolsPrevBtn.disabled = scrollLeft <= 0;
        
        // Check if we can scroll right
        this.toolsNextBtn.disabled = scrollLeft >= (scrollWidth - clientWidth - 1);
        
        // Hide navigation if not needed
        const needsNavigation = scrollWidth > clientWidth;
        this.toolsPrevBtn.style.display = needsNavigation ? 'flex' : 'none';
        this.toolsNextBtn.style.display = needsNavigation ? 'flex' : 'none';
    }

    setLayout(layoutType) {
        // Remove all layout classes
        this.mainContent.classList.remove('pdf-focus', 'balanced', 'chat-focus');
        
        // Add new layout class
        this.mainContent.classList.add(layoutType);
        
        // Update active button
        document.querySelectorAll('.layout-btn-header').forEach(btn => btn.classList.remove('active'));
        
        switch(layoutType) {
            case 'pdf-focus':
                this.layoutPdfFocus.classList.add('active');
                break;
            case 'balanced':
                this.layoutBalanced.classList.add('active');
                break;
            case 'chat-focus':
                this.layoutChatFocus.classList.add('active');
                break;
        }
        
        // Save preference
        localStorage.setItem('layoutPreference', layoutType);
        
        // Update canvas size after layout change
        setTimeout(() => {
            if (this.pdfDoc && this.currentPage) {
                this.renderPage();
            }
        }, 350); // Wait for transition to complete
    }

    setupResizeDivider() {
        let isResizing = false;
        let startX = 0;
        let startPdfWidth = 0;
        
        this.resizeDivider.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startPdfWidth = this.pdfSection.offsetWidth;
            
            // Add visual feedback
            document.body.style.cursor = 'col-resize';
            this.resizeDivider.style.background = 'linear-gradient(to bottom, #667eea, #764ba2)';
            
            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const containerWidth = this.mainContent.offsetWidth - 6; // Subtract divider width
            const newPdfWidth = startPdfWidth + deltaX;
            
            // Calculate percentages
            const pdfPercent = Math.max(20, Math.min(80, (newPdfWidth / containerWidth) * 100));
            const aiPercent = 100 - pdfPercent;
            
            // Apply new sizes
            this.pdfSection.style.flex = `0 0 ${pdfPercent}%`;
            this.aiSection.style.flex = `0 0 ${aiPercent}%`;
            
            // Remove preset classes when manually resizing
            this.mainContent.classList.remove('pdf-focus', 'balanced', 'chat-focus');
            document.querySelectorAll('.layout-btn-header').forEach(btn => btn.classList.remove('active'));
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                this.resizeDivider.style.background = '';
                
                // Save custom layout
                const pdfPercent = parseFloat(this.pdfSection.style.flex.split(' ')[2]);
                localStorage.setItem('customLayout', JSON.stringify({
                    pdfWidth: pdfPercent,
                    aiWidth: 100 - pdfPercent
                }));
                
                // Re-render PDF after resize
                setTimeout(() => {
                    if (this.pdfDoc && this.currentPage) {
                        this.renderPage();
                    }
                }, 100);
            }
        });
    }

    loadLayoutPreference() {
        const savedLayout = localStorage.getItem('layoutPreference');
        const customLayout = localStorage.getItem('customLayout');
        
        if (customLayout) {
            // Load custom layout
            const layout = JSON.parse(customLayout);
            this.pdfSection.style.flex = `0 0 ${layout.pdfWidth}%`;
            this.aiSection.style.flex = `0 0 ${layout.aiWidth}%`;
            // Don't activate any preset button for custom layouts
        } else if (savedLayout) {
            // Load preset layout
            this.setLayout(savedLayout);
        } else {
            // Default to balanced
            this.setLayout('balanced');
        }
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

    async summarizeSelectedText() {
        if (!this.selectedText) return;

        try {
            this.showLoading('Resumindo texto...');
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: this.selectedText })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('user', `📋 Resumir: "${this.selectedText.substring(0, 100)}${this.selectedText.length > 100 ? '...' : ''}"`);
                this.addMessage('ai', data.summary);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error summarizing text:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao resumir o texto. Verifique se a chave da API do Gemini está configurada no arquivo .env e reinicie o servidor.');
            }
        } finally {
            this.hideLoading();
        }
    }

    async lookupDictionary() {
        if (!this.selectedText) return;

        // For dictionary, we want single words or short phrases
        const text = this.selectedText.trim();
        if (text.split(' ').length > 3) {
            this.addMessage('ai', '📚 Para consulta no dicionário, selecione uma palavra ou frase curta (máximo 3 palavras).');
            return;
        }

        try {
            this.showLoading('Consultando dicionário...');
            const response = await fetch('/api/dictionary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ word: text })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('user', `📚 Dicionário: "${text}"`);
                this.addMessage('ai', data.definition);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error looking up dictionary:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addMessage('ai', 'Desculpe, ocorreu um erro ao consultar o dicionário. Verifique se a chave da API do Gemini está configurada no arquivo .env e reinicie o servidor.');
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
                this.addMessage('user', `🏛️ Contexto Histórico: "${this.selectedText.substring(0, 100)}${this.selectedText.length > 100 ? '...' : ''}"`);
                this.addMessage('ai', data.historicalContext);
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

    async generateImageDescription() {
        if (!this.selectedText) return;

        try {
            this.showLoading('Gerando imagem...');
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: this.selectedText })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                this.addMessage('user', `Gerar imagem para: "${this.selectedText}"`);
                this.addImageMessage('ai', data.imageUrl, data.prompt);
            } else {
                throw new Error(data.error || 'Failed to generate image');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            const offline = error?.message?.toLowerCase?.().includes('failed') || error?.name === 'TypeError';
            if (offline) {
                this.addMessage('ai', '⚠️ Falha ao conectar ao servidor. Verifique se o servidor está rodando com "npm start" e tente novamente.');
            } else {
                this.addRetryMessage('ai', 'Desculpe, ocorreu um erro ao gerar a imagem. O serviço pode estar temporariamente indisponível.', 'generateImageDescription');
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

    addImageMessage(sender, imageUrl, prompt) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender} image-message`;
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Generated image';
        img.className = 'generated-image';
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 10px 0;
        `;
        
        // Add loading placeholder
        img.onload = () => {
            loadingDiv.style.display = 'none';
            img.style.display = 'block';
        };
        
        img.onerror = () => {
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p>❌ Erro ao carregar imagem</p>
                    <button onclick="this.parentElement.parentElement.parentElement.querySelector('img').src = this.parentElement.parentElement.parentElement.querySelector('img').src + '&retry=' + Date.now()" 
                            style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
            loadingDiv.style.color = '#e74c3c';
        };
        
        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '🎨 Carregando imagem...';
        loadingDiv.style.cssText = `
            padding: 20px;
            text-align: center;
            color: #666;
            font-style: italic;
        `;
        
        // Create prompt text
        const promptDiv = document.createElement('div');
        promptDiv.className = 'image-prompt';
        promptDiv.innerHTML = `<small><strong>Prompt:</strong> ${prompt}</small>`;
        promptDiv.style.cssText = `
            margin-top: 5px;
            font-size: 0.8em;
            color: #666;
            font-style: italic;
        `;
        
        // Assemble the message
        imageContainer.appendChild(loadingDiv);
        imageContainer.appendChild(img);
        messageDiv.appendChild(imageContainer);
        messageDiv.appendChild(promptDiv);
        
        // Initially hide image until loaded
        img.style.display = 'none';
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addRetryMessage(sender, text, retryMethod) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        
        const retryBtn = document.createElement('button');
        retryBtn.innerHTML = '<i class="fas fa-redo"></i> Tentar Novamente';
        retryBtn.className = 'retry-btn';
        retryBtn.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.2s;
        `;
        
        retryBtn.onmouseover = () => retryBtn.style.background = '#45a049';
        retryBtn.onmouseout = () => retryBtn.style.background = '#4CAF50';
        
        retryBtn.addEventListener('click', () => {
            messageDiv.remove();
            this[retryMethod]();
        });
        
        messageDiv.appendChild(textDiv);
        messageDiv.appendChild(retryBtn);
        
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new AIPDFReader();
});
