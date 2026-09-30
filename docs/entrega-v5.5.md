# BITIRO Lab v5.5 — Final Refinement

- El viewport parte en **Ajustar (100%)** para mantener toda la pista y el IROH visibles.
- Entrar a calibración vuelve automáticamente a Ajustar.
- Calibración muestra progreso real 0–3 sensores, estado de contraste y guardado persistente visible.
- El feedback inferior deja de repetir instrucciones y comunica si la calibración está en curso o lista.
- Se elimina el badge decorativo `CAL`.
- El panel de misión muestra el número de objetivos incluso cerrado.
- Progreso curricular usa `0 / 8` en vez de formato de telemetría `00 / 08`.
- Se reduce el glow de acciones cobre sin cambiar la semántica de señal.
- No se modifica runtime, parser, física ni API IROH.
