# GUIA · Tu WhatsApp oficial conectado hablando con Claude

Palabra: **GUIA** · pieza 2026-11-16-ensayo-claude-reemplaza-a-los · fuentes al final (abiertas el 11/11/2026).

Meta tiene un servidor MCP oficial, «WhatsApp Business Tools». Un MCP es un enchufe: le da a Claude herramientas para entrar a tu cuenta de Meta y hacer cosas por vos. Con este, Claude hace el trámite técnico de conectar un número a la API oficial de WhatsApp (la Cloud API). No arma el bot que contesta: eso va aparte (punto 6).

## 1. Qué tenés que tener antes

- [ ] **Claude Desktop o Claude Code.** Son los dos clientes de Claude que lista la página del servidor. En el plan gratis de Claude podés tener un solo conector personalizado.
- [ ] **Una cuenta de Meta que sea admin del negocio** que querés usar (en Meta se llama rol MANAGE).
- [ ] **Una app de Meta con WhatsApp de la que seas admin**, conectada a ese negocio (se crea en developers.facebook.com con el caso de uso de mensajería de WhatsApp Business). Tiene que ser admin de la app, no solo del negocio.
- [ ] **Los términos de la WhatsApp Business Cloud API aceptados** para ese negocio. Sin eso no se puede registrar el número ni mandar mensajes.
- [ ] **Un número para probar.** Si pensás usar el número que ya usás en la app de WhatsApp, leé antes la guía de inicio de Meta (link al final): no lo registres sin saber qué pasa con tus chats.

Si falta algo, la herramienta te devuelve un error que dice qué arreglar y el link a dónde arreglarlo. Eso lo dice Meta.

## 2. Cómo sumar el conector

**Claude Desktop**
1. Customize > Connectors > + Add > Add custom connector. (La doc de Meta lo nombra Settings > Connectors: si no lo ves en un lado, está en el otro).
2. Nombre: `WhatsApp Business Tools`
3. URL: `https://mcp.facebook.com/whatsapp_business_tools`
4. Continuá y entrá con tu cuenta de Meta. No hace falta client ID ni crear nada más para el conector.

**Claude Code**
```bash
claude mcp add --transport http whatsapp_business https://mcp.facebook.com/whatsapp_business_tools
```
Después, en una sesión, escribí `/mcp`, elegí el servidor y autenticá. Agregá `--scope user` si lo querés en todos tus proyectos.

**Qué permisos pide:** administrar tus negocios, tus cuentas de WhatsApp Business (números, plantillas, webhooks) y mandar mensajes desde tus números registrados. Se revocan en Facebook > Configuración > Tu actividad > Integraciones comerciales.

## 3. Comprobá que anda

Copiá esto en Claude:

> Listame las herramientas que tenés del servidor WhatsApp Business Tools. Después usá whatsapp_biz_businesses y decime qué negocios puedo administrar. No cambies nada todavía.

Anda si te devuelve tus negocios y no un error de permisos. Si no aparece el servidor, puede ser que todavía no te llegó: Meta lo está habilitando de a poco.

## 4. Los 4 pedidos (copiá y pegá, de a uno)

**Pedido 1 · revisar lo que falta**
> Con el servidor WhatsApp Business Tools, elegí el negocio [NOMBRE DEL NEGOCIO]. Revisá si están aceptados los términos de la Cloud API, si hay método de pago y en qué estado está la verificación del negocio. Decime qué falta y pasame el link de cada cosa. No cambies nada.

**Pedido 2 · cuenta, número y código**
> Creá una cuenta de WhatsApp Business en ese negocio (si ya hay una, usá esa y avisame). Agregá el número [+54 9 ...]. Mandá el código de verificación por SMS y esperá a que te lo pase. Antes de cada paso, decime qué vas a hacer.

Cuando te llega el SMS:
> El código es [123456]. Verificá el número.

**Pedido 3 · registro y webhook**
> Registrá el número para mensajería en la Cloud API. Después configurá el webhook con esta URL: [URL DE TU AGENTE] y este token de verificación: [UNA PALABRA QUE INVENTES], y suscribí la cuenta de WhatsApp al webhook. Al final, mostrame qué quedó configurado.

El webhook es la dirección a la que WhatsApp manda cada mensaje que te llega. Si todavía no tenés agente, dejá este paso para después (punto 6).

**Pedido 4 · plantilla y prueba**
> Creá una plantilla en español llamada pedido_listo con este texto: «Hola, tu pedido ya está listo para retirar.» Elegí la categoría que corresponda y explicame por qué. Pasame el link para ver si Meta la aprueba. Cuando esté aprobada, mandámela a mi número [+54 9 ...].

Antes de mandar cualquier mensaje, la herramienta te confirma a quién se lo manda. Leelo.

## 5. La letra chica (de Meta, no mía)

- **Beta.** Las herramientas pueden cambiar.
- **Para desarrollo y pruebas**, «not production sending at scale». No es para campañas.
- **Texto libre solo dentro de las 24 h** desde el último mensaje del cliente. Fuera de esa ventana, solo plantillas aprobadas.
- **Mensajes que se cobran:** necesitan un método de pago cargado en la cuenta.
- **Claude actúa en tu nombre.** Meta avisa que un agente puede hacer todo lo que le permitiste sin preguntarte, incluso si lee instrucciones escondidas en un webhook, un documento o una web. Dale los permisos justos, y si vas a probar, usá una app de prueba y no la del negocio en producción.
- **Revisá cada tanto** qué conectaste, en Integraciones comerciales de Facebook, y sacá lo que no uses.

## 6. Lo que este MCP no hace: el agente que contesta

El MCP deja el número conectado y el webhook apuntando a una URL. Del otro lado tiene que haber algo que reciba cada mensaje y conteste: precios, stock, horarios, turnos. Eso se arma aparte, con una herramienta de automatización o con código, y conectado a tu información (lista de precios, horarios, preguntas frecuentes).

Antes de armarlo, escribí en una hoja:
1. Las 10 preguntas que más te hacen por WhatsApp, tal cual te llegan.
2. La respuesta correcta de cada una y de dónde sale (lista de precios, planilla de stock, horario).
3. Qué preguntas NO tiene que contestar el agente y se pasan a una persona.

Con esa hoja, armar el agente es mucho más fácil. Si lo querés armar con tu equipo, escribime.

## Fuentes

- Meta for Developers, anuncio del WhatsApp Business Tools MCP, 15/09/2026: https://developers.facebook.com/blog/post/2026/09/15/whatsapp-business-messaging-mcp-ai-agent/
- Doc del servidor (endpoint, clientes, requisitos, permisos, herramientas, ventana de 24 h): https://developers.facebook.com/documentation/mcp/whatsapp-business-tools-mcp (actualizada el 29/10/2026, abierta el 11/11/2026)
- Cómo conectar un cliente (comando de Claude Code, /mcp): https://developers.facebook.com/documentation/mcp/connect-an-mcp-client (actualizada el 29/10/2026, abierta el 11/11/2026)
- Servidores MCP de Meta y buenas prácticas de seguridad: https://developers.facebook.com/documentation/mcp (actualizada el 21/09/2026, abierta el 11/11/2026)
- Guía de inicio de WhatsApp en Meta: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started
- Ayuda de Claude, conectores personalizados (menú y límite del plan gratis): https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp (abierta el 11/11/2026)
