# 9 repos de GitHub gratis en vez de software pago (con la letra chica)

Te dejo los 9 links. En cada uno vas a ver qué hace, cuánto cuesta de verdad y qué necesita para andar. Al final, 6 preguntas para hacerte antes de instalar cualquiera en tu negocio.

Dos palabras antes:
- **Repo:** una carpeta pública en GitHub con el código de un programa. Se mira desde el navegador, sin cuenta.
- **Servidor:** una compu que queda prendida siempre (o una que alquilás en internet) para que el programa ande para todo tu equipo. Si un repo dice «self-hosted», necesita uno.

## La cuenta de los USD 1.055 por año

Es lo que cuesta el plan pago más chico que se puede comprar de 6 de las pagas, con pago anual (precios de cada página el 12/11/2026, en dólares):

| Paga | Plan más barato | Por mes, pago anual | Si pagás mes a mes | Página |
|---|---|---|---|---|
| ElevenLabs | Starter | 5 | 6 | https://elevenlabs.io/pricing |
| Notion | Plus | 10 (120 al año) | 12 | https://www.notion.com/pricing |
| Wispr Flow | Pro | 12 | 15 | https://wisprflow.ai/pricing |
| Asana | Starter, 2 lugares (el mínimo que venden) | 21,98 (10,99 × 2) | 26,98 (13,49 × 2) | https://asana.com/pricing |
| Calendly | Standard | 10 | ver página | https://calendly.com/pricing |
| Intercom | Essential | 29 | ver página | https://www.intercom.com/pricing |
| **Total por mes** | | **87,98** | | |
| **Total por año** | | **1.055,76** (87,98 × 12) | | |

No sumé Higgsfield (OpenHiggsfield no lo reemplaza: el video lo cobra igual el proveedor), Semrush (OpenSEO cobra los datos por consulta) ni Loom (Cap pide licencia para negocio). Asana no vende plan para 1 persona: su página dice que el mínimo son planes de 2, 3, 4 o 5 lugares. Si son más personas, los planes de Notion, Wispr Flow, Asana, Calendly e Intercom se cobran por persona.

## 1. OpenHiggsfield (video con IA)
- **Link:** https://github.com/thehiggsfieldai/OpenHiggsfield
- **Qué hace:** un estudio para armar videos cortos con IA: elegís un personaje, escribís una historia de un minuto, revisás seis escenas y una estimación de costo, y generás.
- **Cuánto cuesta:** el programa es gratis (licencia MIT). Cada video lo cobra el proveedor que conectes con tu clave (fal o Higgsfield).
- **Qué necesita:** Docker y una clave de API del proveedor.
- **Letra chica:** su README aclara que no es de Higgsfield y que las estimaciones no son la factura final.

## 2. VoiceStudio (voces con IA, en vez de ElevenLabs)
- **Link:** https://github.com/debpalash/VoiceStudio
- **Qué hace:** clona y diseña voces, dobla videos, dicta y transcribe, todo en tu compu.
- **Cuánto cuesta:** gratis (AGPL-3.0), también para uso comercial según su README. Tiene una versión Pro paga, que no hace falta.
- **Qué necesita:** se baja como app. Anda sin placa de video, más lento.
- **Letra chica:** los modelos de voz tienen su propia licencia (la app te la muestra) y una voz se clona solo con permiso de su dueño.

## 3. OpenSEO (en vez de Semrush)
- **Link:** https://github.com/duckduckdeploy/openseo
- **Qué hace:** auditoría de tu web, ideas de palabras clave, en qué puesto salís en Google (también por ciudad) y quién te enlaza.
- **Cuánto cuesta:** el programa es gratis (MIT). Los datos de búsqueda se pagan por consulta: según su README, desde USD 0,02 un chequeo de posición y unos USD 0,08 una búsqueda de 150 ideas. Le ponés un tope por mes.
- **Qué necesita:** Docker, en tu compu o en un servidor. Su web tiene seis herramientas para probar gratis sin cuenta.

## 4. AppFlowy (en vez de Notion)
- **Link:** https://github.com/AppFlowy-IO/AppFlowy
- **Qué hace:** wiki, documentos, tareas y bases de datos, como Notion.
- **Cuánto cuesta:** la app es gratis (AGPLv3). En su nube, el plan gratis llega a 100 MB; el Pro sale USD 12 por persona por mes con pago anual (appflowy.com/pricing).
- **Qué necesita:** app para Windows, Mac, Linux, iPhone y Android. Para el equipo sin pasar por su nube, un servidor propio.

## 5. OpenWhisper (dictado, en vez de Wispr Flow)
- **Link:** https://github.com/Knuckles92/OpenWhisper
- **Qué hace:** apretás un atajo, hablás y el texto se pega en el programa que tengas abierto. También transcribe audios y reuniones.
- **Cuánto cuesta:** gratis (MIT).
- **Qué necesita:** instalador para Windows, Mac (Apple Silicon, macOS 14 o más) y Linux. Puede usar modelos en tu compu o una API en la nube (esa sí se paga aparte).
- **Letra chica:** el instalador de Windows puede no estar firmado; su README explica cómo verificarlo.

## 6. OpenProject (en vez de Asana)
- **Link:** https://github.com/opf/openproject
- **Qué hace:** proyectos, tareas, diagrama de Gantt, horas cargadas y tableros.
- **Cuánto cuesta:** la Community Edition es gratis (GPL-3.0). Lo pago es la Enterprise (soporte y extras).
- **Qué necesita:** un servidor. Tienen guías de instalación en su web.

## 7. Easy!Appointments (turnos, en vez de Calendly)
- **Link:** https://github.com/alextselegidis/easyappointments
- **Qué hace:** tus clientes sacan turno online; vos manejás servicios, profesionales y horarios. Se sincroniza con Google Calendar.
- **Cuánto cuesta:** gratis para uso personal y comercial, según su README (GPL-3.0). Tiene extras pagos que no hacen falta.
- **Qué necesita:** un servidor con Apache o Nginx, PHP 8.2 o más y MySQL.
- **Por qué no Cal.com:** el repo gratis de Cal.com hoy se llama Cal.diy (https://github.com/calcom/cal.diy) y su README lo recomienda solo para uso personal, no para producción.

## 8. Chatwoot (atención al cliente, en vez de Intercom)
- **Link:** https://github.com/chatwoot/chatwoot
- **Qué hace:** junta en una bandeja el chat de tu web, mail, Facebook, Instagram, WhatsApp, Telegram y SMS. Varias personas responden y las charlas se asignan según quién está disponible.
- **Cuánto cuesta:** gratis (MIT), salvo lo que está en su carpeta «enterprise», que tiene otra licencia.
- **Qué necesita:** un servidor y alguien que lo instale.

## 9. Cap (grabar pantalla, en vez de Loom)
- **Link:** https://github.com/CapSoftware/Cap
- **Qué hace:** grabás la pantalla, editás y compartís un link.
- **Cuánto cuesta:** gratis para uso personal. Para usarlo en un negocio, su página pide un plan pago: licencia de escritorio USD 29 por año, o Cap Pro USD 12 por persona por mes (https://cap.so/pricing).
- **Qué necesita:** app para Mac, Windows y Linux.

---

## Antes de instalar cualquiera, 6 preguntas

1. **¿Para qué tarea es?** Una sola, concreta: «los turnos de la peluquería», no «organizarnos mejor».
2. **¿Se baja como app o necesita servidor?** Si necesita servidor, ¿quién lo instala y quién lo actualiza dentro de seis meses?
3. **¿Qué se paga igual?** Servidor, claves de API, datos por consulta, licencia comercial. Sumalo antes de decir «es gratis».
4. **¿Qué dice la licencia sobre uso comercial?** Leé la sección «License» del README y la página de precios si la tiene.
5. **¿Dónde quedan los datos de tus clientes?** En tu servidor, en su nube o en un tercero (como el proveedor de IA).
6. **¿Quién la usa?** Probala una semana con la persona que la va a usar todos los días, no solo con vos.

Si querés que tu equipo aprenda a elegir y usar herramientas así con IA, doy capacitaciones para empresas. Escribime por acá.
