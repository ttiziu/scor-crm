@echo off
cd /d "%~dp0migrations"
echo Eliminando carpetas de migracion vacias...
rmdir /s /q "20260201000000_add_username_for_login" 2>nul
rmdir /s /q "20260201044728_init" 2>nul
echo Listo. Ahora ejecuta: npx prisma migrate reset
pause
