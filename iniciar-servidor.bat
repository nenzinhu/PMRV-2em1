@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ===================================================================
REM  PMRV - Servidor Local (duplo-clique para iniciar)
REM ===================================================================

REM Garante que node/npm (C:\Program Files\nodejs) esteja no PATH.
set "NPM_PATH=C:\Program Files\nodejs"
if exist "%NPM_PATH%\npm.cmd" (
  set "PATH=%NPM_PATH%;%PATH%"
)

REM Vai para a pasta onde este .bat esta (raiz do projeto PMRV).
cd /d "%~dp0"

REM Verifica se o 'npm' realmente e encontravel. Se nao, avisa e para.
where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: 'npm' nao foi encontrado no PATH.
  echo Instale o Node.js (https://nodejs.org) e tente novamente.
  pause
  exit /b 1
)

REM Mata qualquer servidor 'next dev' que tenha ficado preso na porta 3000
REM (evita a tela de "Internal Server Error" de processos antigos).
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
  taskkill /f /pid %%a >nul 2>nul
)

REM Se as dependencias ainda nao foram instaladas, instala agora.
IF NOT EXIST node_modules (
  echo ----------------------------------------------------------
  echo  Primeira execucao: instalando dependencias (npm install)...
  echo  (pode demorar alguns minutos - nao feche a janela)
  echo ----------------------------------------------------------
  call npm install
  if errorlevel 1 (
    echo.
    echo ERRO: falha ao instalar as dependencias.
    echo Verifique sua conexao com a internet e tente novamente.
    pause
    exit /b 1
  )
)

echo ============================================================
echo  Servidor local PMRV (Next.js) iniciando em:
echo  http://localhost:3000
echo  (Ctrl + C para parar o servidor)
echo ============================================================

REM Abre o navegador na porta fixa 3000.
start "" "http://localhost:3000/"

REM Sobe o servidor FIXO na porta 3000 (-p 3000).
call npx next dev -p 3000
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel iniciar o servidor.
  pause
)
