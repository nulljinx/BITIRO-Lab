## v7.94 · S03 garra con contacto garantizado

- La detección del sonar ya no marca el obstáculo como resuelto de inmediato.
- La garra hace un barrido visible antes de mover la caja.
- El contacto con la caja está garantizado por una secuencia temporal controlada, evitando bloqueos del `while`.
- La caja permanece visible, se desplaza lateralmente y solo después deja libre el recorrido.
- La garra vuelve al centro al finalizar el movimiento.

## v7.92 · S03 movimiento fluido de la garra

- El sonar inicia el barrido del servo, pero la caja no se mueve hasta que la garra la alcanza físicamente.
- El desplazamiento de la caja usa impulso lateral y desaceleración progresiva, evitando el salto instantáneo.
- La garra vuelve al centro después del barrido y el cono del sonar permanece visible.
- La caja sigue visible fuera de la pista después de ser apartada.

## v7.91 · S03 garra mueve el objeto

- En S03, al detectar un obstáculo con sonar, la garra ahora se anima y aparta visualmente la caja.
- La caja deja de bloquear el recorrido, pero permanece visible y se desplaza fuera de la pista.
- Se conserva el cono visual del sonar y la caja ya no desaparece del mapa.

# BITIRO Lab — Entrega integrada v6.6

Esta carpeta conserva las capacidades institucionales previas de v6.5 y añade una **experiencia institucional Mustakis diferenciada** en el hub, el espacio de grupo, la mentoría y el laboratorio, sin alterar el modelo de permisos ni convertir BITIRO en una marca exclusiva de una institución.

Consulta primero [`docs/ENTREGA-v6.6-MUSTAKIS.md`](docs/ENTREGA-v6.6-MUSTAKIS.md) y después [`docs/ENTREGA-v6.5-INTEGRATED.md`](docs/ENTREGA-v6.5-INTEGRATED.md) para el estado del laboratorio integrado. El documento distingue explícitamente qué está implementado, qué requiere validar y qué no constituye todavía una plataforma educativa terminada para todas las sesiones.

La aplicación usa React/Vite, Supabase y su propio motor IROH dentro de un Web Worker. El render de perspectiva es una primera base 3D independiente del motor, no una réplica definitiva del hardware.
