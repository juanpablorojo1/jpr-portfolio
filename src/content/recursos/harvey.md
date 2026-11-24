# HARVEY · El agente de Claude que sale a buscarte clientes

Palabra: **HARVEY** · Juan Pablo Rojo · repo leído el 24/11/2026.

## El link

**https://github.com/ethanplusai/sellbird**

Harvey cambió de nombre: ahora se llama **Sellbird** (desde la versión 0.4.0). El link viejo, `github.com/ethanplusai/harvey`, te lleva al mismo lugar. Es de código abierto (licencia AGPL-3.0; hasta la 0.3 era MIT) y tiene más de 7 mil estrellas en GitHub.

## Qué hace

1. Le contás qué vendés y cómo es tu cliente ideal (lo «entrenás» con la web de tu negocio).
2. Busca empresas que necesitan lo que vendés y encuentra a la persona que decide.
3. Les escribe un mail personalizado sobre algo real que encontró de ellas.
4. Lee las respuestas y sigue la conversación.
5. Todo se ve en un tablero en tu compu.

**Por defecto no manda nada sin que lo apruebes**: los mails quedan en una bandeja de salida hasta que les das el OK. Hay un modo piloto automático, pero se prende a mano.

## Qué necesitás

- **Claude Pro o Max con Claude Code** (sin API key ni pago por uso: usa tu plan). También anda con ChatGPT y Codex.
- **Un mail para enviar:** Gmail o Google Workspace (recomendado), Microsoft 365 o cualquier SMTP. El repo estima unos 7 USD por mes si usás Google Workspace. Conviene un dominio o una casilla aparte, no tu mail principal.
- **Python 3.11 o más nuevo** en la compu.
- La búsqueda de empresas es **gratis** por defecto (usa OpenStreetMap). Hay fuentes pagas opcionales, y siempre te muestra cuánto cuestan antes de correr.

## Cómo se instala (la forma fácil)

1. Bajá el repo: `git clone https://github.com/ethanplusai/sellbird`
2. Entrá a la carpeta y abrí Claude Code: `cd sellbird` y después `claude`
3. Pedile: **«set up Sellbird for me»**. Claude te guía con la instalación y la configuración.

Si preferís hacerlo a mano, los pasos están en el README del repo (instalar, copiar `.env.example` a `.env`, entrenar con la web de tu empresa y correr el tablero).

## Antes de mandar el primer mail

- Empezá con **pocos mails por día** y revisalos todos antes de aprobarlos.
- Escribile solo a empresas, con algo que de verdad les sirva. Si alguien te pide que no le escribas más, sacalo de la lista.
- Probalo primero con tu propio negocio como cliente imaginario: ves qué escribiría sin mandarle nada a nadie.

Si lo querés armar para tu negocio y no sabés por dónde arrancar, escribime.

## Fuentes

- Repo y README de Sellbird (antes Harvey): https://github.com/ethanplusai/sellbird (leído 24/11/2026)
- Página del cambio de nombre: https://sellbird.ai/harvey/
