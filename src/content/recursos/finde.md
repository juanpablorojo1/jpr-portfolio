# FINDE · 5 proyectos con Claude para arrancar este fin de semana

Guía paso a paso de Juan Pablo Rojo. Revisada con la documentación de Claude el 11/11/2026. Si un botón cambió de nombre, la ruta sigue siendo la misma idea.

## Plan del finde

| Día | Proyecto | Necesitás |
|---|---|---|
| Sábado | 2 · La memoria del negocio | Cuenta de Claude (sirve la gratis) |
| Sábado | 1 · Secretario en la nube | Plan Pro o más + Gmail y Google Calendar |
| Sábado | 3 · El tablero del local | Plan Pro o más + Claude Code (terminal o app de escritorio) |
| Domingo | 4 · Agente de contenido | Plan pago (Research) + el Proyecto del 2 |
| Domingo | 5 · Un equipo de agentes | Claude Code + ganas de probar algo experimental |

Empezá por el 2: los demás salen mejor si Claude ya sabe cómo es tu negocio.

---

## 2 · La memoria del negocio (Proyectos)

Qué es: un espacio de Claude con sus propios chats, archivos e instrucciones. Todo lo que hablás ahí arranca sabiendo lo que cargaste.

1. Entrá a claude.ai → **Projects** → crear proyecto. Ponele el nombre de tu negocio.
2. En el conocimiento del proyecto subí: lista de precios, horarios, zonas y costos de envío, política de cambios, las 10 preguntas que más te hacen y 3 o 4 mensajes que escribiste vos (para que tome tu forma de hablar).
3. En las instrucciones del proyecto pegá esto y completá lo que está entre corchetes:

```
Sos el asistente de [nombre del negocio], un/a [rubro] en [ciudad].
Usá solo la información de los archivos del proyecto. Si un dato no está, decí "No lo tengo" y no lo inventes.
Escribí como en los mensajes de ejemplo: corto, en voseo y sin emojis.
Precios siempre con la fecha de la lista que figura en el archivo.
```

4. Probalo: preguntale algo que no esté en los archivos. Tiene que decir que no lo tiene.

Ojo: no subas datos personales de clientes ni contraseñas.

## 1 · Secretario en la nube (tarea programada + Gmail y Calendar)

Qué es: una tarea que Claude corre solo, en la nube, aunque tengas la compu cerrada. Como mucho una vez por hora; para esto alcanza con una vez por día.

1. Conectá Gmail y Google Calendar en claude.ai/customize/connectors.
2. Entrá a claude.ai/code/routines → **New task** (si te ofrece «Create with Claude» o «Set up manually», elegí manual).
3. Nombre: «Resumen de la mañana». No elijas repositorio: así queda como tarea del chat de claude.ai.
4. Prompt:

```
Leé los mails que entraron desde ayer a las 19 h y mis eventos de Google Calendar de hoy.
Armá un resumen con tres partes:
1. Lo que tengo que responder hoy (quién, qué pide, para cuándo).
2. Pedidos o entregas de proveedores.
3. Mi agenda del día, en orden.
No envíes, no borres y no respondas ningún mail. No modifiques el calendario. Solo resumí.
Si no hay nada en una parte, escribí "Nada".
```

5. Trigger: **Schedule**, diario, 7:07 (la doc recomienda unos minutos después de la hora en punto para que no arranque tarde). La hora va en tu zona horaria.
6. En **Advanced settings → Connectors** dejá solo Gmail y Google Calendar.
7. Apretá **Run now** una vez para probarla y leé el resultado.

Ojo: está en vista previa y gasta del mismo uso que tus chats.

## 3 · El tablero del local (artifact con datos en vivo)

Qué es: una página en claude.ai que, cada vez que la abrís, trae tus datos actualizados por los conectores.

1. Necesitás Claude Code versión 2.1.209 o más nueva, con sesión iniciada con tu cuenta de claude.ai (`/login`).
2. Con Gmail y Calendar conectados (paso 1 del proyecto anterior), escribile:

```
Armá un artifact que sea el tablero de mi negocio. Cuando se abra la página, que traiga por mis conectores:
- Los turnos o eventos de Google Calendar de hoy y de mañana.
- Los mails sin leer de los últimos 3 días, con remitente y asunto.
Que tenga un botón para refrescar, se lea bien en el celular y no tenga botones que manden mails.
Si un conector no está, que muestre qué hay que conectar.
```

3. Claude te pide permiso para publicar con conectores: aceptá. Te da un link privado. Guardalo en el celular.

Ojo: si lo compartís, cada persona ve sus propios datos, no los tuyos.

## 4 · Agente de contenido (Research + el Proyecto del 2)

Qué es: Claude investiga en la web con varias búsquedas encadenadas y después escribe con lo que sabe de tu negocio.

1. Abrí un chat dentro del Proyecto del 2 y activá **Research** (plan pago).
2. Pedile:

```
Investigá qué publicaron en su web en las últimas dos semanas tres negocios como el mío en [ciudad]: [nombre 1], [nombre 2], [nombre 3].
Decime qué temas repiten, qué formatos usan y qué no está haciendo nadie. Dejá el link de cada cosa que cites.
Después escribí 5 guiones de reels de 20 segundos para mi negocio, con mi forma de hablar (está en los mensajes de ejemplo del proyecto). Cada guion: primera frase, tres frases más y qué se ve en pantalla.
```

3. Revisá los links antes de creerle un dato, y cada guion antes de grabarlo. Research busca en la web y en las herramientas que tengas conectadas; si le pedís Instagram, fijate que cada posteo que cite tenga su link.

Ojo: Research consume tus límites más rápido. Si lo querés todas las semanas, podés copiar el prompt en una tarea programada (proyecto 1), pero revisalo igual antes de publicar.

## 5 · Un equipo de agentes (Claude Code, para los más avanzados)

Qué es: una sesión de Claude Code hace de jefe, crea compañeros que trabajan cada uno por su lado y junta los resultados.

1. Activalo (es experimental). En `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

2. Abrí Claude Code en una carpeta vacía y pedile:

```
Armá un equipo de 3 compañeros para analizar mi competencia: [nombre 1], [nombre 2], [nombre 3], negocios de [rubro] en [ciudad].
- Uno junta precios publicados.
- Otro lee reseñas públicas y resume quejas y elogios.
- Otro mira qué publican en redes.
Cuando terminen, juntá todo en un informe de una página con links a cada fuente y tres ideas para mi negocio.
```

3. Moviéndote con las flechas en el panel de abajo ves qué hace cada compañero y le podés escribir directo.

Ojo: gasta bastante más que una sesión sola. La doc recomienda arrancar con 3 a 5 compañeros y con tareas de investigar o revisar. En Windows funciona en la misma terminal (los paneles divididos no andan en Windows Terminal).

---

## Fuentes (leídas el 11/11/2026)

- Tareas programadas: https://code.claude.com/docs/en/web-scheduled-tasks
- Gmail y Calendar: https://support.claude.com/en/articles/10166901-using-the-gmail-and-google-calendar-integrations
- Proyectos: https://support.claude.com/en/articles/9517075-what-are-projects
- Artifacts con conectores: https://code.claude.com/docs/en/artifacts
- Research: https://support.claude.com/en/articles/11088861-using-research-on-claude
- Equipos de agentes: https://code.claude.com/docs/en/agent-teams

Si querés armar esto con tu equipo de trabajo, escribime.
