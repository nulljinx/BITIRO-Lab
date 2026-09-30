# BITIRO Lab v5 — Signal Lab UI

Esta iteración aplica una dirección de arte híbrida basada en el concepto **código → señal → movimiento**.

## Cambios de producto

- El gradiente cian/azul/violeta deja de ser el lenguaje principal de la interfaz.
- Azul/cian queda reservado para estructura de marca y navegación.
- Cobre/naranja identifica acción, señal y movimiento vivo.
- Explorer adopta una ruta curricular inspirada en trazas de PCB, sin dibujar SVG manuales.
- Se mantienen iconos profesionales de `lucide-react` en toda la interfaz.
- El editor adopta una paleta de instrumento técnico, con cursor y estados vivos en cobre.
- El simulador usa un fondo técnico cálido y un indicador de `Señal activa` durante ejecución.
- Telemetría, IR, LCD y calibración se presentan como instrumentos compactos.
- Se agregan microanimaciones funcionales: recorrido de señal, estado de ejecución y cambios de sensores.
- `prefers-reduced-motion` sigue desactivando las animaciones no esenciales.
- Se aumenta el zoom inicial de S01 a 125% para aprovechar mejor el viewport.

## No modificado

- parser
- intérprete
- runtime IROH
- física
- API de la librería
- contenido curricular
- formato de las pistas

## Iconografía

Toda la iconografía funcional usa `lucide-react`. No se añadieron SVG dibujados manualmente.
