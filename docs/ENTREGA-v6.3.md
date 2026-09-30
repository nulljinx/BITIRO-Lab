# BITIRO Lab 6.3.2 — Institutional Hardening

## Implementado

- flujo account-first: registro/login antes de cualquier código institucional;
- `/espacios` protegido por autenticación;
- redirección segura post-login/registro hacia rutas BITIRO permitidas;
- eliminación del bypass institucional anónimo/local;
- onboarding de `Mis espacios` para usuarios sin programas;
- código institucional disponible solo dentro de una cuenta autenticada;
- workspace Mustakis personalizado con saludo, sede, grupo, rol y próxima práctica;
- ficha institucional con enlaces oficiales externos;
- sesiones bloqueadas sin revelar título, conceptos ni resumen al participante;
- control de contenidos por mentor conservado;
- S01/S02 interactivas;
- corrección geométrica 6.2.1 conservada.

## Pendiente

- generación/revocación de códigos desde UI autorizada;
- participantes y analítica para mentor;
- progreso cloud `visited → attempted → completed`;
- contenidos privados servidos bajo autorización;
- modo foco;
- renderer 3D;
- S03–S08 interactivas.

## Principio de acceso

El código institucional no autentica ni crea identidades. La identidad se resuelve primero mediante la cuenta BITIRO. La RPC de redención exige `auth.uid()` y el frontend no muestra el formulario de código fuera de `/espacios`.
