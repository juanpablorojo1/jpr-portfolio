# Cómo edité «Este video no lo edité yo» con Google Vids y Claude Code

Palabra: **VIDEO**

Grabás con el celu. Google Vids te cambia el lugar, la ropa y la voz. Claude Code corta, subtitula, anima, mezcla y lo revisa antes de que lo veas. Acá está todo el proceso, con los prompts para copiar enteros.

Lo probé el 13 y el 14/11/2026. Si algún menú no te aparece igual, es que cambió.

---

## Lo que necesitás

- **El celu** para grabar.
- **Una compu con Chrome o Edge.** Vids se edita solo en la compu; en el celu solo se mira.
- **Una cuenta de Google.** Con un Gmail común anda. Entrá a **vids.new**. Cuántos clips con IA podés hacer por mes depende de tu cuenta: Vids te muestra cuántos te quedan.
- **Claude Code.** Necesita un plan pago de Claude o la API (el gratis no lo trae). Se instala desde https://code.claude.com/docs/en/setup
- **La skill de Remotion** (Remotion arma videos con código). En una terminal: `npx skills add remotion-dev/skills`. Es gratis para personas y empresas de hasta 3 personas; más grandes, licencia paga (https://www.remotion.dev/license).
- **faster-whisper** (transcribe gratis en tu compu): `pip install faster-whisper`
- **ffmpeg.** Si no lo tenés, pedíselo a Claude Code: «instalame ffmpeg y verificá que ande».

## El orden

1. Grabás.
2. Claude Code corta el crudo en escenas.
3. Vids cambia lugar y ropa en cada escena (si no querés, salteá este paso).
4. Claude Code le pone subtítulos y movimiento.
5. Claude Code hace el sonido.
6. Un equipo de agentes lo revisa.
7. Lo mirás entero en el celu.

---

## 1. Grabá

- Vertical, luz de frente, el celu a la altura de los ojos.
- Una idea por toma. Si te trabás, repetí la frase entera: después se queda con la mejor.
- **Al terminar cada frase, quedate quieto 1 segundo mirando la lente.** Ese segundo lo necesita Vids (te explico en el paso 3).

## 2. Cortá en escenas (Claude Code)

Pasá el video a una carpeta, abrí Claude Code ahí y pegá esto:

```
Tengo un video vertical grabado con el celu: [NOMBRE DEL ARCHIVO]. No lo borres ni lo muevas.

1. Transcribilo con faster-whisper (modelo large-v3, español, tiempos por palabra). Corregí nombres mal transcritos (por ejemplo «Cloud» por «Claude»).
2. Marcá los silencios de más de 0,4 s, las frases repetidas y donde me trabé. Si repetí una frase, quedate con la mejor toma.
3. Dividilo en escenas, una por idea. Cada escena arranca un poco antes de la primera palabra y termina 1 s después de la última. Ninguna puede durar más de 10 s: si una es más larga, partila en una pausa.
4. Mostrame la lista de escenas con lo que digo en cada una y esperá mi OK.
5. Con mi OK, exportá cada escena como un archivo aparte (escenas/01.mp4, 02.mp4…) con ffmpeg, en un solo filter_complex con trim por cuadro, a 30 fps constantes (nunca -ss con copia de stream).
6. Verificá que en ninguna escena la voz y la imagen se corran ni un cuadro. Decime qué mediste.
```

Si no vas a usar Vids, pedile además que una todas las escenas en un solo video y pasá al paso 4.

## 3. Cambiá lugar y ropa (Google Vids)

1. Entrá a **vids.new**. Antes de hacer nada: **Archivo → Tamaño del video → Vertical 9:16**.
2. Subí las escenas, **una por escena** de Vids (botón +, seleccionás la escena vacía e insertás el clip ahí; si no, queda superpuesto).
3. Clic en el clip → **Edit with Omni** (o «Edit video») → Omni · 1080p · Portrait.
4. Escribí el cambio. Tarda más o menos un minuto y medio por clip.
5. Si te gusta, **Replace** para que reemplace al original.
6. Al final, borrá los subtítulos que pone Vids (en español escribe mal los nombres: a mí me puso «Cloud Code») y descargá: **Archivo → Descargar → MP4**.

### Prompts que me anduvieron

Van en inglés: así rechaza menos. Cortos, con uno o dos cambios por vez.

```
Change the background to a rooftop at sunset with real depth. Change his t-shirt to a red hoodie.
```

```
Turn the empty background into a cinematic motion-design studio at night with real depth. Simple glowing red and white shapes draw themselves in the air.
```

```
Change the background to a cozy voxel-style office at night. Several small cute blocky voxel toy robots in colorful hoodies work at their desks.
```

Y para corregir algo de un clip que ya generó, sobre ese mismo clip:

```
Remove the red laser beams.
```

### Lo que nadie te dice de Vids

- **Rehace tu voz.** Omni genera la voz de nuevo y mueve los labios según esa voz. Si usás Vids en una escena, usá la voz de Vids en todas: si mezclás con tu voz real, los labios no pegan.
- **Puede cambiarte alguna palabra.** Escuchá cada clip antes de usarlo.
- **Devuelve un clip del mismo largo que le das,** y su voz es un poco más lenta. Por eso el segundo quieto al final: sin él, te corta la última palabra.
- **Edita 10 segundos como máximo.** Y cada escena de Vids dura 5 s como mínimo: si subís un clip de 2 s, te quedan 3 s en blanco (partí la escena y borrá lo que sobra).
- **Si te dice «goes against our terms»:** primero «Try again». Después, un prompt más corto. Si sigue, editá el clip que Vids ya generó en vez del original: pasa mucho más fácil. Las imágenes de referencia hacen que rechace más; describilo con palabras. A veces lo que frena es lo que decís en el audio, no la imagen.
- **Si le pasás un clip sin sonido, inventa lo que decís,** a veces en inglés. Así salió la parte en inglés de mi reel.

## 4. Subtítulos y movimiento (Claude Code + Remotion)

```
Usá la skill de Remotion. Partí de [EL MP4 QUE BAJASTE DE VIDS, o el video cortado si no usaste Vids]. Transcribilo de nuevo con tiempos por palabra (si viene de Vids, la voz cambió). Armá una composición de 1080×1920 a 30 fps:

- Subtítulos de 1 a 3 palabras que entren justo con cada palabra, fuera de los 220 px de arriba y los 340 px de abajo (ahí van los botones de Instagram).
- Cámara viva: zoom de 6 a 12 % en las palabras importantes y un barrido rápido en cada corte.
- En cada idea, un solo gráfico que la muestre: un número grande, una captura real o una lista de 2 líneas. Si la imagen ya lo muestra, nada.
- Estilo: [ELEGÍ UNO DE LOS 4 DE ABAJO]. Colores: [TUS COLORES], un solo color fuerte por pantalla. Tipografía: [TUS FUENTES].
- Cierre de 2 s con mi nombre y mi usuario.

Primero renderizá 5 segundos de prueba y mostrámelos. Después el video entero. Si el render falla, probá con --concurrency=1.
```

### 4 estilos

| Estilo | Qué es | Cuándo |
|---|---|---|
| Timeline que crece | Abajo, 4 filas (VOZ, SUB, GFX, AUDIO) que se llenan a medida que explicás cada paso. Es el de mi reel. | Videos que cuentan un proceso. |
| Cámara viva | Zoom corto en cada palabra importante y barrido rápido en cada corte. | Cara a cámara, siempre. |
| Pantalla dividida | Captura arriba, tu cara abajo. | Cuando mostrás algo en la compu. |
| Palabras gigantes | 1 a 3 palabras enormes sobre la imagen. | El número o la idea que querés que se acuerden. Máximo 3 o 4 por video. |

Un consejo que me costó aprender: **menos es más.** Si la escena de Vids ya muestra la idea, no le agregues carteles encima.

## 5. Sonido (Claude Code)

```
Con el render y la lista de cortes, hacé la mezcla:

1. Música [ARCHIVO, con licencia para redes] debajo de la voz, con sidechain: que baje cuando hablo y suba en las pausas.
2. Un efecto en cada corte y en cada zoom: whoosh en los barridos (adelantalo para que el pico caiga justo en el corte), golpe corto y bajito en los zooms, clic en lo que aparece. Nunca encima de una palabra clave.
3. Volumen final: −14 LUFS integrados y pico máximo −1 dBTP, con ganancia fija y un limitador (no uses loudnorm dinámico: baja la voz en cada golpe).
4. Medí y decime los números finales, y exportá un MP4 de menos de 20 MB para mandarme al celu.
```

Efectos gratis, con uso comercial y sin atribución: Mixkit (https://mixkit.co/free-sound-effects/). Buscá «Fast whoosh transition», «Short bass hit», «Camera shutter click», «Select click» y «Modern click box check».

## 6. El equipo de revisores (el paso que casi nadie hace)

```
Antes de mostrarme el video, armá un equipo de revisores con subagentes. Cada uno mira el render final, solo su tema, extrayendo cuadros con ffmpeg y midiendo el audio:

1. Transcripción: compará los subtítulos palabra por palabra con lo que se escucha. Nombres propios bien escritos.
2. Subtítulos: que entren justo con la palabra, que no me tapen la cara y que no caigan en los 220 px de arriba ni en los 340 px de abajo.
3. Cortes y transiciones: mirá cuadro por cuadro medio segundo antes y después de cada corte. Nada de cuadros negros, saltos ni frases cortadas.
4. Sincronía y sonido: que la voz y la imagen no se corran ni un cuadro, los efectos caigan en el corte y no encima de una palabra clave, −14 LUFS y pico de −1 dBTP o menos.

Cada uno me devuelve APROBADO o la lista de arreglos con el segundo exacto. Aplicá los arreglos y volvé a pasarlos, como máximo 2 vueltas. Recién cuando aprueban todos, mostrámelo.
```

## 7. Miralo en el celu

Entero, con sonido, antes de publicar. Al subirlo, activá la etiqueta **«Información de IA»**: la voz y los escenarios son generados.

---

Si querés que tu equipo aprenda a usar IA así en su trabajo, escribime por acá.

**Juan Pablo Rojo** · @jrojo.ia

## Fuentes

- Google Vids, ayuda oficial: https://support.google.com/docs/answer/15081495 y https://support.google.com/docs/answer/17570752
- Novedades de Vids (video vertical, Omni): https://workspaceupdates.googleblog.com/search/label/Google%20Vids
- Claude Code: https://code.claude.com/docs/en/setup
- Skill de Remotion: https://www.remotion.dev/docs/ai/skills
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
