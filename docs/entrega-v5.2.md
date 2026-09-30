# BITIRO Lab v5.2 — Design System Cleanup

## Objetivo

Saneamiento de la arquitectura visual sin modificar runtime, parser, física, sensores ni API IROH.

## Cambios

- `tokens.css` pasa a ser la única fuente de valores de paleta sólidos.
- Se agregan tokens semánticos para superficies, instrumentación, bordes, texto, acciones, estados, readouts, radios, sombras y motion.
- `explorer.css`, `workspace.css`, `global.css`, `art-direction.css` y `product-polish.css` ya no contienen colores hexadecimales directos.
- Se eliminan definiciones de tokens de diseño fuera de `tokens.css`.
- Explorer y Workspace comparten el mismo `--surface-page`; las diferencias claras/oscuras ahora son decisiones semánticas de panel, no fondos accidentales por cascada.
- El cobre es el CTA principal coherente en Explorer, S01 y acciones de señal/movimiento.
- Azul/cian queda reservado para marca, navegación y estructura.
- Paneles de telemetría/calibración usan superficies semánticas, hairlines y radios bajos; no dependen del antiguo card kit.
- Ruta curricular incorpora estados persistentes:
  - disponible: nodo hueco neutro
  - siguiente: nodo con contorno cobre
  - explorada: nodo azul sólido
- Se reducen radios y sombras en paneles anclados. Sombras fuertes quedan reservadas a elementos flotantes/acciones.
- Los archivos versionados de estilos fueron renombrados a `art-direction.css` y `product-polish.css`.

## Guardia de arquitectura

Se agrega:

```bash
npm run audit:design
```

El script falla si encuentra:

- colores hexadecimales crudos fuera de `tokens.css`;
- `white` / `black` usados directamente como color de superficie/texto;
- tokens de diseño redefinidos fuera de `tokens.css`.

## No modificado

- runtime
- parser
- intérprete
- física
- motor de simulación
- sensores
- API IROH
- persistencia del editor
