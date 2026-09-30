# BITIRO Lab v7.29 — S02 3D zone labels

## Cambio principal
Se añadieron etiquetas flotantes en la vista 3D para las zonas de llegada de S02.

## Objetivo
Hacer explícita la identificación de las bases en el modelo 3D para que el estudiante distinga con rapidez:
- Base 1
- Base 2
- Base 3

## Implementación
- Cada zona final proyecta una insignia flotante en 3D.
- Si la etiqueta contiene un número (por ejemplo `Base 1`), la insignia resalta `BASE` + número grande.
- Si no contiene número, se muestra la etiqueta completa.

## Beneficio pedagógico
El estudiante ya no depende solo del mapa 2D o del texto del panel para identificar la base correcta.
