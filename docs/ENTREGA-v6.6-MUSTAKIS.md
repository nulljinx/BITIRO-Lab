# BITIRO Lab v6.6 — Experiencia institucional Mustakis

## Objetivo de esta iteración

Esta versión comienza la personalización profunda del espacio de **Fundación Mustakis** sin duplicar la aplicación ni romper el modelo multi-institución de BITIRO. La personalización queda acotada al `theme: 'mustakis'`, de modo que futuras instituciones puedan recibir otra experiencia sin heredar estos estilos.

## Cambios implementados

- **Hub de espacios:** la tarjeta de Mustakis tiene tratamiento visual propio y mantiene visible el rol, la sede y el grupo.
- **Inicio institucional:** hero diferenciado, identidad conjunta `BITIRO Lab × Fundación Mustakis`, contexto del programa, siguiente desafío y avance sobre prácticas publicadas.
- **Ruta de aprendizaje:** S01–S08 mantienen las mismas reglas de publicación y permisos, pero se presentan como una ruta visual del programa con estados disponibles/bloqueados/preparación.
- **Experiencia pedagógica:** se incorpora la secuencia visual `Explora → Programa → Resuelve → Reflexiona` como guía de uso de BITIRO dentro del taller. Es copy de producto BITIRO, no una declaración de metodología oficial de Fundación Mustakis.
- **Mentoría:** el panel conserva invitaciones, participantes, publicación de sesiones y permisos, pero recibe el tema institucional.
- **Laboratorio:** cuando se abre una sesión desde un workspace Mustakis, la identidad institucional continúa en encabezado, tabs y barra del simulador sin alterar el editor, el motor, los sensores ni la persistencia.
- **Arquitectura:** la presentación pública de la organización incluye textos de experiencia (`experienceLabel`, `tagline`, `programDescription`); la autorización sigue viniendo exclusivamente del backend.

## Identidad y límites

Se tomó como referencia pública que Fundación Mustakis presenta **Poppins** como tipografía institucional y que Robótica Educativa forma parte de su programa de Ciencia y Tecnología. Esta entrega no incorpora archivos tipográficos ni logos descargados desde terceros. La paleta Mustakis incluida es una **interpretación UI provisional de BITIRO para el piloto**, centralizada en `tokens.css`, preparada para reemplazarse por valores/activos oficiales cuando el usuario aporte el paquete autorizado.

No se modifica el funcionamiento de cuentas, cohortes, RLS, invitaciones, liberación de sesiones, Cloud Learning ni evaluación formativa. Tampoco se afirma que S03–S08 estén implementadas físicamente: sus estados siguen dependiendo de `session.interactive` y de la publicación real del grupo.

## Archivos principales modificados

- `src/content/organizations.ts`
- `src/features/workspaces/WorkspacePages.tsx`
- `src/app/Topbar.tsx`
- `src/app/App.tsx`
- `src/styles/tokens.css`
- `src/styles/institution.css`
- `src/styles/global.css`

## Validación realizada en esta entrega

- Parser de TypeScript sobre los archivos TS/TSX modificados: **sin errores sintácticos**.
- `node tools/audit-design-tokens.mjs`: **aprobado**; los colores funcionales permanecen centralizados en `tokens.css`.
- No fue posible instalar `node_modules` en el entorno de construcción porque el registro npm no tenía resolución de red. Por eso **no se afirma** que `pnpm verify`, Vitest o Playwright hayan sido ejecutados en esta iteración. En un equipo con dependencias disponibles se debe ejecutar `pnpm install --frozen-lockfile` y `pnpm verify` antes de desplegar.

## Siguiente revisión visual recomendada

1. Entrar con cuenta participante al grupo Mustakis/Talca y revisar escritorio + móvil.
2. Entrar con cuenta mentor y revisar inicio + `/mentor`.
3. Abrir S01 y S02 desde el workspace Mustakis para verificar continuidad visual del laboratorio.
4. Cuando se disponga del paquete gráfico oficial autorizado, reemplazar paleta provisional y añadir logo/tipografía sin modificar permisos ni datos.
