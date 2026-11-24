# MOTION · Cómo hago videos animados con Claude Code y Remotion

Palabra: **MOTION** · Juan Pablo Rojo · revisado el 24/11/2026.

El video que viste no lo animé a mano. Lo armó Claude Code con código, en **Remotion**, una herramienta para hacer videos programando. Yo hice tres cosas: grabé la voz, le expliqué el personaje y le dije qué corregir. Acá va el proceso, con los prompts para copiar.

## Lo que necesitás

- **Claude Code.** Necesita un plan pago de Claude (Pro o Max) o la API. Se instala desde https://code.claude.com/docs/en/setup
- **Node.js 18 o más nuevo** en la compu (https://nodejs.org).
- **La skill de Remotion**, que le enseña a Claude a usarlo bien. En una terminal: `npx skills add remotion-dev/skills`
- **Tu voz grabada con el celu.** Un audio de WhatsApp alcanza.
- Remotion es **gratis** para personas y empresas de hasta 3 personas. Si son más, lleva licencia paga: https://www.remotion.dev/license

## Paso 1 · El guion y el personaje

Escribí el guion en una frase por renglón y grabalo con tu voz. Después abrí Claude Code en una carpeta nueva y pegá esto:

```
Quiero hacer un video vertical de Instagram (1080x1920, 30 fps) en Remotion, animado con un personaje.
Usá la skill de Remotion. Si no hay proyecto, crealo con npx create-video@latest.

El audio de mi voz está en [ARCHIVO]. Transcribilo con tiempos por palabra y usalo para sincronizar todo.

El personaje: [CÓMO ES: forma, colores, ropa, qué tiene en la cara].
Cómo se mueve: [POR EJEMPLO: rebota un poco al caminar, gesticula con las manos].
Su personalidad: [POR EJEMPLO: curioso, un poco torpe, siempre contento].

Antes de animar, mostrame una imagen fija del personaje y esperá mi OK.
```

## Paso 2 · Las escenas

Cuando el personaje te guste, pedile el video entero:

```
Ahora armá una escena por cada idea del guion. Cada escena es un decorado chico, con algo que pase en pantalla mientras hablo.
Poné subtítulos grandes palabra por palabra y resaltá en color las palabras clave.
Que cada movimiento y cada texto entren justo cuando digo la palabra.
Al terminar, sacá una imagen por escena y revisala vos antes de mostrarme.
```

## Paso 3 · La revisión

Mirá el video en Remotion Studio (`npx remotion studio`) y corregí hablando normal, como con una persona:

- «Este texto entra muy rápido, que entre cuando digo "precio".»
- «Acá el personaje tiene que saltar.»
- «La escena del final dura mucho, cortala un segundo.»

Cuando esté, pedile: «renderizá el video final en MP4».

## Música

Para Instagram usá música libre, porque los temas comerciales pueden quedar silenciados: por ejemplo la biblioteca de Kevin MacLeod (incompetech.com, pide poner su nombre en la descripción) o Pixabay Music. Pedile a Claude que la baje bajo la voz, para que se te entienda.

## Para una pyme

Con esto podés sacar un video explicativo por semana (cómo se usa tu producto, una novedad, una respuesta a lo que más te preguntan) sin pagarle a un editor. El primero lleva un rato; los siguientes reusan el mismo personaje y salen mucho más rápido.

Si lo querés armar para tu negocio y no sabés por dónde arrancar, escribime.

## Fuentes

- Remotion: https://www.remotion.dev · licencia: https://www.remotion.dev/license
- Skill de Remotion para Claude: https://github.com/remotion-dev/skills
- Claude Code: https://code.claude.com/docs/en/setup
