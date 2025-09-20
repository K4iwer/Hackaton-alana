@echo off
echo ========================================
echo      AI PDF Reader - Iniciando...
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js nao esta instalado!
    echo Execute setup.bat primeiro para instalar as dependencias.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo [WARNING] Arquivo .env nao encontrado!
    echo Copiando .env.example para .env...
    copy .env.example .env
    echo.
    echo [IMPORTANTE] Configure sua chave da API do Gemini no arquivo .env
    echo Edite o arquivo .env e adicione: GEMINI_API_KEY=sua_chave_aqui
    echo.
    pause
)

echo [INFO] Iniciando servidor...
echo Acesse: http://localhost:3000
echo Pressione Ctrl+C para parar o servidor
echo.

npm start
