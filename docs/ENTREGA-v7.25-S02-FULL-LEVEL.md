# BITIRO Lab v7.25 — S02 Full Level

## Objetivo
Empezar la expansión de los niveles desde una base validada, consolidando S02 antes de habilitar pistas posteriores con criterios todavía no confirmados.

## S02
- Starter code específico para S02.
- Variables múltiples separadas por coma y función propia `leerLinea()`.
- Recordatorio de `&&` y `||` dentro del desafío.
- Guía visual de IR: DER → Base 1, IZQ → Base 2, ambos → Base 3.
- La evaluación formativa exige ahora detectar la intersección **y detenerse al menos 300 ms** sobre ella.
- Se conservan las comprobaciones de lectura de los tres sensores y llegada detenida a la base elegida.

## Ruta S03–S08
Se actualizaron los nombres/temas visibles con la información ya documentada, pero siguen marcados como `interactive:false`. No se habilitan como laboratorios completos hasta validar pista y criterios de misión.

## Validación
- `MissionEvaluator.ts`, `sessions.ts`, tipos y utilidades relacionadas compilan con TypeScript global sin emitir archivos.
- Se añadieron pruebas Vitest para la pausa real en la intersección y para el starter code S02. El proyecto no incluye `node_modules`, por lo que no se ejecutó la suite Vitest completa dentro de este paquete.
