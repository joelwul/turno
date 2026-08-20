   @echo off
   title TURNO - Servidor (deja esta ventana abierta)
   cd /d "%~dp0frontend"
   echo Iniciando Turno... NO cierres esta ventana.
   npm run dev
   pause