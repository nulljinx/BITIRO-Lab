# BITIRO Lab v7.24 — Comparaciones lógicas

## Objetivo
Dejar explícitamente soportados y documentados los operadores lógicos que los estudiantes necesitan para combinar lecturas de sensores y decisiones del robot.

## Operadores
- `&&` — AND / “y”: todas las condiciones deben ser verdaderas.
- `||` — OR / “o”: basta con que una condición sea verdadera.
- `!` — NOT / negación: ya estaba disponible y sigue funcionando.

## Ejemplos
```cpp
if (si < UMBRAL_I && sc > UMBRAL_C && sd < UMBRAL_D) {
  avanzar(30);
}

if (irIzq == 1 || irDer == 1) {
  detenerse();
}
```

## Comportamiento
El parser conserva la precedencia de C++ para comparaciones y operadores lógicos y el intérprete aplica cortocircuito: una parte innecesaria de una expresión `&&` o `||` no se evalúa.

## Verificación añadida
Se añadieron pruebas específicas para AND, OR, combinaciones de sensores, precedencia y cortocircuito.
