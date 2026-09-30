# BITIRO Lab v7.11 — Viewport Stability

## Corrección principal
Esta versión vuelve a la base estable de la v7.7 y corrige dos problemas sin comprimir el simulador:

- El viewport 3D conserva una altura amplia en escritorio.
- La cámara aplica margen automático cuando el canvas es muy ancho y bajo, evitando que la pista quede recortada.
- La vista Perspectiva inicia ligeramente más abierta.
- El editor deja de depender de una altura total fija: Monaco tiene su propia altura y los botones **Revisar código** / **Ejecutar en simulador** quedan fuera de cualquier recorte.
- Se elimina el sello de marca que podía superponerse al título de la misión.

No se modifica física, sensores, Supabase, roles ni lógica de ejecución.
