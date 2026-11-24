# API y MCP para tu negocio

Palabra: **MCP** · Juan Pablo Rojo · fuentes leídas entre el 12 y el 16/11/2026 (al final).

## 1. Qué es cada cosa, en una línea

- **API:** la puerta de un sistema para que otro programa le pida cosas. Para usarla sacás una clave, elegís permisos y alguien escribe el código que le dice al sistema exactamente qué hacer (puede ser un programador o Claude Code). Para cada tarea nueva, más código.
- **MCP (Model Context Protocol):** un estándar abierto para conectar la IA con sistemas de afuera. Conectás el sistema en Claude o ChatGPT, iniciás sesión, y el sistema le muestra a la IA lo que sabe hacer; vos se lo pedís con palabras. Sirve igual en cualquier IA que lo soporte.
- **Servidor MCP:** el programa que le pasa a la IA la lista de lo que sabe hacer un sistema (en Google Drive: buscar, leer, crear, compartir). Por abajo, casi siempre usa la API de ese sistema.

Resumen: la API es la puerta; MCP le explica a la IA qué hay detrás y cómo abrirla. No compiten: MCP casi siempre usa la API por abajo.

## 2. Antes de conectar nada

- [ ] Fijate qué apps usa tu negocio todos los días (mail, agenda, planillas, cobros, sistema de stock o de facturación).
- [ ] Para cada una, preguntale al proveedor o a quien te hizo el sistema:
  - «¿Tiene API?»
  - «¿Tiene servidor MCP oficial? ¿Cuál es la dirección (URL)?»
  - «¿Qué puede leer y qué puede cambiar la IA si lo conecto?»
- [ ] Decidí qué datos no tienen que pasar por la IA (datos de clientes, de salud, contraseñas).

## 3. Cómo se suma un servidor MCP en Claude

**Lo más fácil: un conector del directorio.** En Claude en español: **Configuración > Personalizar > Conectores**, pestaña **Descubrir**. Buscá la app (por ejemplo Google Drive), tocá el **+** de su tarjeta y entrá con tu cuenta (el inicio de sesión es obligatorio). Queda **✓ Conectado**. El conector de Google Drive lo hizo Google (servidor MCP `drivemcp.googleapis.com/mcp/v1`) y en su ficha, en **Herramientas**, ves todo lo que sabe hacer: `search_files` (buscar), `read_file_content` (leer), `create_file` (crear), `share_file` (compartir) y más. Después pedile: «Buscá el presupuesto de la panadería y compartíselo a Laura».

**Si tu proveedor te da una dirección de servidor MCP**, se agrega a mano. Según la ayuda de Claude (los nombres de los botones están en inglés en la ayuda; en la app en español pueden estar traducidos):

1. Abrí **Personalizar > Conectores** (en inglés, Customize > Connectors).
2. Tocá **+ Add** y después **Add custom connector**.
3. Poné un nombre y la dirección en el campo **remote MCP server URL**. **Continue**.
4. Revisá la autenticación que detecta y elegí cómo entrar: **Sign in now**, **Sign in when needed** o **No sign in**.
5. Si el servidor pide una clave fija, va en **Request headers**.
6. **Add** para terminar.

En Team y Enterprise lo agrega el dueño o un admin desde **Organization settings > Connectors**, y cada persona después lo conecta en Personalizar > Conectores.

Ojo:
- Anda en Claude, Cowork y Claude Desktop, de Free a Enterprise. En **Free** podés agregar **uno solo** así.
- Anthropic **no verifica** estos conectores: conectá solo servidores de alguien de confianza.
- El servidor tiene que estar en internet; si está en una red privada hay que habilitar las IP de Anthropic.
- Para cambiar la dirección, se borra y se vuelve a agregar.
- Si una herramienta puede escribir o borrar, pensalo dos veces antes de dejarla prendida.

## 4. Cómo se suma en ChatGPT

Según la documentación de OpenAI (página sin fecha): en la pantalla de **Plugins**, tocá **+** y **Add custom MCP server**, poné la dirección y los datos de acceso, aceptá el aviso de riesgo y crealo. Después lo podés usar en el chat. OpenAI aclara que estos servidores **no los desarrolla ni los verifica** OpenAI. La página no dice en qué planes está: fijate si te aparece en el tuyo.

## 5. Prueba de 5 minutos

Una vez conectado, pedile algo chico y de solo lectura, y mirá qué herramienta usa:

```
Usando el conector de [nombre de la app], decime [algo que solo se puede saber mirando esa app, por ejemplo: qué turnos tengo mañana].
Antes de cambiar cualquier cosa, preguntame.
Si no encontrás el dato, decime que no lo encontraste; no lo inventes.
```

Si contesta con datos de tu app, la conexión anda. Si inventa, desconectalo y revisá el paso 3.

## 6. Cuándo conviene una cosa o la otra

- **Querés que dos sistemas se pasen datos solos, siempre igual** (la tienda con el stock, la planilla con los pedidos): eso es API, con una automatización.
- **Querés pedirle cosas a la IA en tus palabras y que use tus apps** (ver la agenda, buscar un mail, armar un borrador): eso es MCP.

Si lo querés armar con tu equipo, con las apps que ya usan, escribime.

## Fuentes

- Qué es MCP, estándar abierto, USB-C, Claude y ChatGPT: https://modelcontextprotocol.io/docs/getting-started/intro (leída 12/11/2026)
- Servidores y herramientas («Tools can… call external APIs»): https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts.md (versión 2026-07-28)
- Anuncio de Anthropic: https://www.anthropic.com/news/model-context-protocol (25/11/2024)
- Conectores en Claude: https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities (leída 12/11/2026)
- Conector de Google Drive en Claude, hecho por Google: https://claude.com/connectors/google-drive (leída 16/11/2026); ficha en la app de Claude (Personalizar > Conectores > Google Drive: herramientas, «Inicio de sesión: Obligatorio», URL del conector), vista el 16/11/2026
- API de Google Drive: https://developers.google.com/workspace/drive/api/guides/about-sdk (leída 16/11/2026)
- Conectores personalizados en Claude: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp (leída 12/11/2026)
- MCP en ChatGPT: https://developers.openai.com/api/docs/mcp/ (sin fecha, leída 12/11/2026)
- Qué es una API: https://developer.mozilla.org/en-US/docs/Glossary/API (11/07/2025)
