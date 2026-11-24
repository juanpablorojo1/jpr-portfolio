# CLAUDE · Arrancá con Claude Code

Juan Pablo Rojo · @jrojo.ia

Claude Code es Claude trabajando en tu compu: lee tus archivos, escribe código, corre comandos y te muestra qué hizo. Esta guía te lleva de cero a tu primer proyecto. Revisada con la documentación oficial el 21/11/2026.

## 1. Qué necesitás
- Un plan pago de Claude (Pro o superior) o una cuenta de la API. El plan gratis no incluye Claude Code.
- Windows 10 o más nuevo, macOS 13 o más nuevo, o Linux, con 4 GB de RAM.
- Si no te gusta la terminal, la app de escritorio de Claude trae Claude Code adentro.

## 2. Instalalo
Abrí una terminal y pegá el comando de tu sistema:

- **Windows (PowerShell):** `irm https://claude.ai/install.ps1 | iex`
- **Mac o Linux:** `curl -fsSL https://claude.ai/install.sh | bash`

Cerrá y abrí la terminal, y escribí `claude --version`. Si te muestra un número, quedó instalado. Si dice que no encuentra `claude`, la página de problemas de instalación de la documentación oficial lo resuelve.

## 3. Tu primer proyecto
1. Creá una carpeta vacía, por ejemplo `mi-primer-proyecto`, y abrí la terminal ahí.
2. Escribí `claude`. La primera vez te pide iniciar sesión en el navegador.
3. Pedile algo concreto: «Armame una página web de una sola pantalla para presentar mi consultorio, con horarios y un botón de WhatsApp. Usá HTML y CSS simples y abrímela cuando esté».
4. Antes de cambiar archivos o correr comandos, te pide permiso. Leé qué va a hacer y aceptá.

## 4. El CLAUDE.md: la memoria del proyecto
Cada sesión arranca de cero. El archivo `CLAUDE.md`, en la carpeta del proyecto, es lo que Claude lee siempre al empezar.

- Escribí `/init` y Claude te arma uno mirando tu proyecto.
- Después sumale lo que no puede adivinar: para quién es, cómo querés que escriba, qué no tiene que tocar.
- Que sea corto: la documentación recomienda menos de 200 líneas. Si algo no lo usás en todas las sesiones, no va ahí.

Ejemplo:

```
# Mi consultorio
- Web de una página para pacientes. Texto en español, con voseo.
- Nunca pongas precios ni datos de pacientes.
- Antes de terminar, abrí la página y revisá que se vea bien en el celular.
```

## 5. Cinco pedidos para probar
1. «Explicame qué hay en esta carpeta y qué hace cada archivo, como si no supiera programar.»
2. «Leé esta planilla (arrastrá el archivo) y armame un resumen con los 5 datos más importantes.»
3. «Armame un script que renombre todas las fotos de esta carpeta con la fecha en que se sacaron.»
4. «Revisá esta página: decime qué se ve mal en el celular y arreglalo.»
5. «Antes de hacer nada, armame un plan de 5 pasos para [lo que quieras] y esperá que te lo apruebe.»

## Ojo con esto
- Claude Code puede borrar o cambiar archivos si se lo permitís: probá primero en una carpeta de prueba.
- No le pegues contraseñas ni datos de pacientes o clientes.
- Si se traba o se va por las ramas, la tecla Esc lo frena y le podés explicar de nuevo.

Fuente: documentación oficial de Claude Code, code.claude.com/docs (instalación y memoria del proyecto).
