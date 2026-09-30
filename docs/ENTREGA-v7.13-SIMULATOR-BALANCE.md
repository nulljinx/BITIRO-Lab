# BITIRO Lab v7.13 — Simulator balance + telemetry visibility

## Cambios aplicados

### 1) API highlight
- `leerSensorLineaIzquierdo()` y `leerSensorLineaDerecho()` ahora se reconocen desde S01 para que Monaco los destaque en naranja igual que el resto de la librería IROH.

### 2) Simulador
- Se aumentó la altura útil del panel del simulador en escritorio.
- Se amplió el área visible del viewport 3D.
- Se rebalanceó la relación viewport / telemetría para que el modelado tenga más aire sin perder el panel lateral.

### 3) Panel derecho de telemetría
- Se compactó el HUD para mostrar más información en la misma altura.
- Se adelantó la sección de `Pulsador y golpe` para que quede visible antes.
- Se redujo la altura visual de LCD, IR, runtime y feedback para evitar que el pulsador quede tan abajo.

### 4) Cabecera del editor
- Se compactó la franja superior del editor (archivo, sincronización, actividad del grupo y barra de acciones) para reducir ruido visual.

## Objetivo
Mejorar la lectura del simulador, hacer más visible el pulsador y disminuir la sensación de compresión en la zona 3D y en la parte superior del editor.
