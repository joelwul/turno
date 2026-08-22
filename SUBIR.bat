@echo off
title SUBIR cambios a Vercel
cd /d "%~dp0"
git add .
git commit -m "actualizacion automatica"
git push
echo.
echo LISTO! Vercel se redeploya solo en ~1 minuto.
pause