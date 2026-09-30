# Entrega BITIRO Lab 6.1 — S02 interactiva

Incremento funcional sobre v6.0. La dirección visual, cuentas, permisos y seguridad permanecen sin cambios. El foco de esta entrega es aumentar el valor pedagógico del simulador incorporando una segunda misión interactiva.

## Cambios

- S02 (`Tres sensores y elección de base`) pasa de material/editor a simulación interactiva.
- Se incorpora una pista virtual 100 × 200 cm reconstruida desde el plotter de S02, con salida inferior, recorrido curvo, intersección y tres bases superiores.
- Las tres bases se representan como zonas de llegada independientes: Base 1, Base 2 y Base 3.
- El runtime existente se reutiliza sin crear una API paralela: sensores de línea, IR, LCD, movimiento y pausas son los mismos del IROH virtual.
- El motor deja de estar acoplado a S01: ahora el Worker se configura por pista antes de aceptar código.
- `Arena` y el renderer reciben la pista activa en lugar de importar S01 directamente.
- El registro de pistas interactivas centraliza qué sesiones tienen simulación real.
- El Explorer identifica S02 como `Simulación interactiva` y comunica que S01–S02 ya tienen laboratorio.
- El renderer deja de asumir dimensiones 100 × 140 y soporta el grid físico de cada pista.
- Se centralizan también los colores propios del mundo simulado en `simulation-theme.ts`; no son tokens de UI.

## Importante sobre la geometría S02

La geometría virtual se reconstruyó desde el plotter raster 100 × 200 cm incluido en el proyecto. Conserva la estructura pedagógica relevante: salida, línea principal, intersección, tres ramas y tres bases.

No debe presentarse todavía como una extracción vectorial de precisión milimétrica. Antes de una publicación institucional conviene contrastarla con el archivo fuente/vectorial original o con medidas oficiales del plotter.

## Pruebas agregadas

`src/tests/tracks.test.ts` comprueba:

- que S01 y S02 están registradas como simulaciones y S03 no;
- dimensiones y tres zonas de llegada de S02;
- alineación inicial del sensor central con la línea;
- correspondencia entre las tres ramas y Base 1 / Base 2 / Base 3.

## Alcance que no cambia

- S03–S08 siguen como material/editor.
- El progreso `visited/inprogress/completed` no se convierte todavía en evaluación pedagógica automática.
- No se modifica parser, lenguaje permitido, API IROH, autenticación ni RLS.
- No se añade sincronización cloud de código.
- No se modifica el modelo multi-organización todavía pendiente.
