# Espacios institucionales — BITIRO Lab 6.3.2

## Idea de producto

BITIRO es la plataforma. Una institución es un espacio separado dentro de BITIRO. El usuario crea primero una cuenta BITIRO y solo después se vincula a un programa mediante un código entregado por la institución o mentor.

```text
Cuenta BITIRO autenticada
    ↓
Mis espacios
    ↓
Código institucional
    ↓
Organización + sede + programa + cohorte
    ↓
Sesiones liberadas por el mentor
```

El código no sustituye registro ni login.

## Fundación Mustakis

Mustakis es la primera implementación del modelo. La interfaz usa co-branding textual y enlaces externos, pero no incorpora un logotipo institucional de terceros sin autorización.

El workspace muestra:

- BITIRO Lab × Fundación Mustakis;
- Ciencia y Tecnología · Robótica Educativa;
- saludo personalizado;
- sede del participante;
- cohorte/grupo;
- rol dentro del espacio;
- próxima práctica habilitada;
- enlace al sitio de la Fundación;
- enlace a Robótica Educativa;
- sesiones habilitadas;
- acceso al panel de mentor cuando el rol lo permite.

Las sesiones bloqueadas muestran únicamente su referencia y estado “Próximamente”; no adelantan el desafío ni sus conceptos.

## Autorización

La UI no es la barrera de seguridad.

- `redeem_workspace_code()` exige autenticación y valida el código en PostgreSQL.
- `list_my_workspaces()` solo devuelve espacios del usuario actual.
- `list_workspace_sessions()` exige pertenencia al grupo o permiso superior.
- `mentor_set_session_release()` exige rol de mentor, admin de organización o admin de plataforma.
- una ruta directa a una sesión bloqueada vuelve a consultar la disponibilidad.

## Códigos

Los códigos deben generarse en backend, con entropía suficiente, caducidad y/o uso máximo cuando corresponda. No deben existir códigos maestros incrustados en frontend.

La RPC limita intentos por usuario autenticado. Esto complementa los límites de proveedor/WAF.

## Protección de contenidos

Ocultar un botón no protege material ya incluido en el bundle. Para material que deba permanecer reservado antes de una clase, utilizar almacenamiento privado/API y entregar el contenido solo después de comprobar la liberación de la sesión.

S01 y S02 permanecen en el cliente porque el simulador actual es client-side.

## Próximos incrementos

1. generación y revocación de códigos desde panel autorizado;
2. vista de grupos/participantes para mentor;
3. progreso `visited → attempted → completed`;
4. contenidos privados por sesión;
5. modo foco del laboratorio;
6. renderer 3D sobre el motor existente.

## Endurecimiento 6.3.2

La identidad de un espacio ya no se resuelve solo por organización. Toda ruta institucional transporta también la cohorte:

```text
/espacios/:organizationId/grupos/:cohortId
/espacios/:organizationId/grupos/:cohortId/mentor
/espacios/:organizationId/grupos/:cohortId/intermedio/:sessionId
```

`list_my_workspaces()` entrega el `role` efectivo de esa cohorte y la capacidad explícita `can_manage`. La presentación de contenido usa `released || can_manage`; el título del rol no sustituye la autorización de la RPC.

El acceso efectivo comprueba organización, programa, sede (si existe), cohorte, membresía institucional y membresía de cohorte activas. Un código compartido no reactiva membresías suspendidas.

El guardado local institucional usa una identidad equivalente a:

```text
usuario + cohorte + sesión + versión de actividad
```

por lo que el código/progreso de S01 en un grupo no se reutiliza en otro grupo del mismo usuario.
