# BITIRO Lab 7.61 — IROH raster por capas

## Objetivo
Reemplazar la mascota SVG del login por las 19 capas raster 3D entregadas para conservar el acabado visual original y permitir microanimaciones.

## Implementado
- Seguimiento del cursor moviendo solo iris/pupilas.
- Inclinación sutil de cabeza.
- Parpadeo automático cada 4–7 segundos.
- Al enfocar contraseña oculta: se muestran los PNG de ojos cerrados.
- Al mostrar la contraseña: vuelve la mirada interactiva.
- Idle: flotación, sombra, mejillas, destellos y brazo con microanimación.
- Estado success preparado.
- `prefers-reduced-motion` respetado.

## Assets
`public/brand/iroh/interactive/`

Fuente visual: paquete final `Robot-Mustakis-paquete-capas(2).zip`, lienzo 900 × 1086, 19 capas raster.
