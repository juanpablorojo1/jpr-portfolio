@echo off
rem Lanza el build de produccion ya hecho (.next) en el puerto 3041. Antes: next build sobre el HEAD.
cd /d "%~dp0"
set NODE_OPTIONS=--use-system-ca
node node_modules
ext\distin
ext start -p 3041
