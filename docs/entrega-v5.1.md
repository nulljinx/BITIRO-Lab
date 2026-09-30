# BITIRO Lab v5.1 — Polish pass

Esta iteración conserva runtime, parser, física, API IROH y lógica de calibración. Los cambios están concentrados en UI/UX y dirección de arte.

## Cambios

- Hero del explorador más compacto y editorial.
- Banco de pruebas S01 más bajo y con preview técnico más compacto.
- Learning path con estados más claros y motion más contenido.
- Eliminación preventiva de overflow horizontal global.
- Header reducido para recuperar espacio de trabajo.
- Workspace S01 más compacto; se elimina la acción duplicada «Misión y conceptos» del encabezado porque la Guía global ya abre el contenido de la sesión actual.
- HUD de telemetría ampliado y compactado para reducir scroll interno en 1080p.
- Runtime y feedback convertidos en una franja de instrumento más baja.
- Calibración compactada sin eliminar controles ni lecturas.
- Navegación y CTAs de entrada se mantienen en azul BITIRO; cobre queda reservado a ejecución, señal viva y calibración.
- Microinteracciones refinadas, con soporte `prefers-reduced-motion` conservado.

## No se modificó

- parser
- runtime
- física del IROH
- sensores
- API IROH
- formato de pistas
- persistencia de código
