# BITIRO Lab 7.62 — IROH layered layout fix

## Corrección
El selector general `.auth-visual-stage img` estaba imponiendo `position: relative` a cada capa raster de IROH. Esto hacía que las piezas dejaran de superponerse según las coordenadas del lienzo 900×1086 y aparecieran separadas.

Se fuerza `position: absolute` para las capas de `InteractiveIroh` y se normalizan los contenedores internos a 100% del lienzo.

No se modifica la lógica de mirada, parpadeo ni privacidad de contraseña.
