# BITIRO Lab v7.4 — Integrated Simulator Framing

## Objetivo
Corregir la presentación visual observada en las capturas del simulador integrado, sin alterar física, sensores, Supabase ni permisos.

## Cambios
- Cámara Perspectiva con encuadre más equilibrado y leve sesgo hacia la posición del IROH para evitar que quede pegado al borde.
- Vista Superior 3D con mayor margen para que pista y robot entren completos.
- Vista Seguir IROH más cercana, pensada como inspección visual del robot.
- Línea negra de la pista sin costuras de segmento visibles.
- Selector de cámaras más compacto para tapar menos escena.
- Overlay técnico y estado de Golpe reducidos.
- Vignette sutil para dar profundidad sin oscurecer la pista.

## No cambia
- física;
- sensores;
- lógica de Golpe;
- interpretación Arduino/C++;
- autenticación;
- progreso y roles.
