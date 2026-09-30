# BITIRO Lab 7.60 — Interactive IROH

## Cambios
- Nuevo componente `InteractiveIroh.tsx` construido por capas SVG.
- Pupilas siguen el cursor suavemente.
- IROH cierra los ojos cuando el campo de contraseña está enfocado.
- Al mostrar la contraseña, vuelve a abrir los ojos.
- Parpadeo idle aleatorio cada 4–7 segundos.
- Pose de privacidad y pose de éxito.
- Respeta `prefers-reduced-motion`.
- Figma modular creado con piezas separadas y variantes de ojos/estados de login.

## Nota de validación
El entorno de entrega no incluye `node_modules`, por lo que no se pudo ejecutar `npm run typecheck/test/build` aquí. Los cambios se realizaron sobre la versión 7.59 previamente entregada.
