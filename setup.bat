@echo off
echo ========================================
echo    AI PDF Reader - Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js nao esta instalado!
    echo.
    echo Por favor, instale o Node.js primeiro:
    echo 1. Va para https://nodejs.org/
    echo 2. Baixe a versao LTS mais recente
    echo 3. Execute o instalador
    echo 4. Reinicie o terminal e execute este script novamente
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js encontrado!
node --version
npm --version
echo.

REM Install dependencies
echo [INFO] Instalando dependencias...
npm install

if %errorlevel% neq 0 (
    echo [ERROR] Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Dependencias instaladas com sucesso!
echo.

REM Check if .env file exists
if not exist .env (
    echo [INFO] Criando arquivo .env...
    copy .env.example .env
    echo.
    echo [IMPORTANTE] Configure sua chave da API do Gemini no arquivo .env
    echo Edite o arquivo .env e adicione: GEMINI_API_KEY=sua_chave_aqui
    echo.
    echo Como obter a chave da API:
    echo 1. Acesse: https://makersuite.google.com/app/apikey
    echo 2. Faca login com sua conta Google
    echo 3. Clique em "Create API Key"
    echo 4. Copie a chave e cole no arquivo .env
    echo.
)

echo ========================================
echo           Setup Concluido!
echo ========================================
echo.
echo Para iniciar a aplicacao:
echo   npm start
echo.
echo Depois acesse: http://localhost:3000
echo.
pause
