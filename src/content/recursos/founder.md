# FOUNDER · Once especialistas que prueban tu negocio antes de lanzarlo

Palabra: **FOUNDER** · Juan Pablo Rojo · repo leído el 26/11/2026.

Si le preguntás a Claude si tu idea es buena, casi siempre te dice que sí. La **Founder Skill** hace lo contrario: son once skills de Claude que te prueban el negocio antes de que pongas un peso. Es gratis, de código abierto (licencia MIT), no pide cuenta ni API key. La armó Jake Schincariol.

## El link

**https://github.com/Jakeschincariol/founder-skill**

## Cómo se instala

La forma fácil: pegale a Claude el link del repo y escribí `install skill`.

```
https://github.com/Jakeschincariol/founder-skill

install skill
```

En Claude Code también se instala como plugin:

```
/plugin marketplace add Jakeschincariol/founder-skill
/plugin install founder-skill@founder-skill
```

Algunas herramientas usan Python 3.8 o más nuevo (no hay que instalar nada más).

## Las dos que usé en el video

**`/founder-board` · el directorio.** Tres miembros evalúan tu idea con tres marcos publicados: el de las ofertas (del libro *$100M Offers* de Alex Hormozi), el del monopolio (*Zero to One* de Peter Thiel) y el de producto (la biografía de Steve Jobs de Walter Isaacson). Cada uno te pone una nota, te dice qué podría matar el negocio y vota. Ojo: aplica las ideas de esos libros, no son esas personas hablando.

**`/founder-consumer` · el panel de clientes.** Arma compradores simulados a partir de tu cliente ideal, cada uno con su plata, sus costumbres y sus dudas, y cuenta quién compra, quién no y por qué. Por defecto son 100; yo lo corrí con 10. Son clientes **simulados**: sirven para encontrar objeciones antes de gastar, no reemplazan hablar con clientes reales.

## Las otras nueve

- `/founder-competitors`: tus competidores, sus precios y de qué se quejan sus clientes.
- `/founder-pricing`: el rango de precio que acepta el panel.
- `/founder-offer`: arma la oferta que responde a las objeciones y la vuelve a probar.
- `/founder-cfo`: márgenes, punto de equilibrio y el primer año mes a mes.
- `/founder-marketing`: posicionamiento, canales y una campaña de 30 días.
- `/founder-brand`: nombre, tono y una guía para la imagen.
- `/founder-ops`: proveedores, rutinas y riesgos.
- `/founder-launch`: una prueba barata primero y el plan de lanzamiento.
- `/founder-plan`: junta todo en un plan de negocio con un veredicto calculado.

El orden recomendado es: board, competitors, consumer, pricing, offer, cfo, marketing, brand, ops, launch y plan. Cada una lee lo que escribieron las anteriores en una carpeta `founder/` de tu proyecto.

## Lo que me pasó a mí

Le pasé mis capacitaciones de IA para pymes. El directorio me puso 5, 4 y 6 sobre 10, y el marco de Hormozi me marcó que estaba vendiendo un curso y no un resultado. De 10 compradores simulados, ninguno compró, y 4 dijeron «ya pagué un curso que nadie terminó». Lo que cambio: mostrar horas ahorradas, no clases.

Si lo querés probar con tu negocio y no sabés por dónde arrancar, escribime.

## Fuentes

- Repo y README de la Founder Skill: https://github.com/Jakeschincariol/founder-skill (leído el 26/11/2026)
