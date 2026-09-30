# BITIRO Lab — arquitectura de producto 6.3

## Capas

```text
BITIRO
├── Cuenta personal
├── Mis espacios (requiere cuenta)
│   ├── Fundación Mustakis
│   │   └── Robótica Intermedia · cohorte/sede
│   └── futuras instituciones
└── Laboratorios
    ├── Editor Arduino/C++
    ├── SimulationEngine
    ├── Renderer 2D actual
    └── Renderer 3D futuro
```

## Cuenta antes que institución

El registro crea una cuenta BITIRO con rol global de participante y sin sede obligatoria. Solo después de autenticarse aparece la opción de redimir un código institucional.

Esto evita mezclar identidad, permisos globales, rol institucional, sede y cohorte.

## Código institucional

El código no crea una identidad. Solo agrega una membresía a una cuenta autenticada. Después de redimirlo, el usuario no necesita volver a escribirlo.

## Contenido por cohorte

`content_releases` define qué sesiones puede abrir un grupo. El mentor controla la liberación y la ruta institucional vuelve a validarla antes de mostrar la sesión. La existencia de un componente React oculto nunca se considera autorización.

## Personalización institucional

La presentación pública de una organización está separada de su autorización. Esto permite personalizar nombre, descripción y enlaces sin mezclar esos datos con las reglas de seguridad. Assets oficiales de terceros deben ser provistos/autorizados por la institución.

## Simulación

S01 y S02 están conectadas al motor actual. El futuro 3D debe consumir el mismo estado del `SimulationEngine`; no debe trasladar parser, sensores ni física a la capa visual.
