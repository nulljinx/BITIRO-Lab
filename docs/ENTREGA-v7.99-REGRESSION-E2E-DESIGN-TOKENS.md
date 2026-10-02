# BITIRO Lab v7.99 — Regression, E2E & design-token maintenance

- S03: la evaluación de intersecciones usa ahora el evento autoritativo `INTERSECTION_RESPONDED` emitido por el motor al completar el giro de 180°, evitando divergencia entre física y evaluador.
- E2E: las pruebas de laboratorio omiten el tutorial inicial salvo la nueva prueba dedicada al onboarding.
- E2E: se actualizaron nombres de vistas, disponibilidad real de S04/S05, calibración guiada y navegación de autenticación.
- Tutorial: nueva prueba dedicada verifica primera apertura, paso Guía, persistencia del estado visto y reapertura manual.
- Design tokens: se centralizaron colores legacy de las hojas institucionales/plataforma/workspace en `tokens.css` sin elevar el baseline.
- S05 permanece funcional en los cuatro casos de selección de base.
