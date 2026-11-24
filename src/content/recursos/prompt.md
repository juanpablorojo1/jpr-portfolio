# PROMPT · El mismo prompt a 3 modelos: la cítrica de gomita

Juan Pablo Rojo · @jrojo.ia

Quise probar Opus 5.5 y compararlo con Sonnet 5 y Astra 6 con el mismo pedido: una rodaja de cítrico de gomita en 3D que se puede agarrar, estirar y soltar. Lo hice con WebGPU en un solo HTML.

- **Modelos:** Sonnet 5 (effort high), Opus 5.5 (effort medium) y Astra 6 (high).
- **El video de los tres lado a lado:** en el post de LinkedIn → https://www.linkedin.com/posts/juan-pablo-rojo-83b843243_quise-probar-opus-55-y-compararlo-con-sonnet-ugcPost-7509029357236113408-4wil/

## Cómo usarlo

Copiá el prompt entero, pegalo en el modelo que quieras probar y abrí el HTML que te devuelve en Chrome o Edge (WebGPU no anda en todos los navegadores). Si no se ve nada, pedile que arregle el error que muestra la consola.

## El prompt exacto

```
Create a beautiful, interactive 3D gummy citrus slice using WebGPU. Deliver the complete experience in one standalone HTML file with embedded JavaScript and WGSL shaders.

This must be a real-time 3D simulation, not a video, image, or looping animation.

APPEARANCE

Create a thick, semicircular orange slice with translucent, juicy flesh, eight distinct segments, delicate internal membranes, tiny bubbles, a pale pith layer, and a soft orange rind.

Make it look like premium gummy candy: saturated color, glossy highlights, light passing through the flesh, convincing refraction, and soft contact shadows. Avoid excessive bloom, washed-out colors, or a hard plastic appearance.

Use a warm, light studio background and a clean editorial interface with generous whitespace. Add the large italic serif title “Citrus Jelly.” Keep controls compact and the slice clearly visible.

SOFT-BODY PHYSICS

The jelly feel is the most important part.

- Grab any part of the slice with a mouse or finger.
- Pull, lift, stretch, twist, and release it.
- Make deformation local: pulling one edge should stretch nearby flesh while the rest follows naturally.
- After release, the slice should wobble, overshoot, and gradually recover its original shape.
- Include gravity, inertia, damping, ground collisions, and soft bouncing.
- Preserve volume approximately and prevent the mesh from collapsing or turning inside out.
- Make the rind slightly firmer than the flesh.
- Internal segments, membranes, and bubbles must follow the deformation without floating outside the body.

Use a stable volumetric soft-body solver, such as a tetrahedral mesh with XPBD constraints. Do not imitate softness by scaling or rotating the entire object.

CONTROLS

Include three color presets: Orange, Lemon, and Ruby.

Add:
- Firmness slider.
- Internal damping slider.
- “Give it a nudge” button.
- Reset button.
- Quarter-speed checkbox.
- Show mesh checkbox.
- Pause/resume button.

Display small live readouts for mass, percentage of rest volume, and kinetic energy.

TECHNICAL REQUIREMENTS

Use genuine WebGPU rendering with WGSL shaders. Generate all geometry and visual details procedurally, without imported models or image files.

Keep simulation updates independent of rendering frame rate. Support desktop and touch devices. Show a clear fallback message if WebGPU is unavailable.

Test strong dragging, repeated releases, all controls, and narrow screens. Fix unstable physics, broken geometry, and visual artifacts before delivering the finished HTML.
```
