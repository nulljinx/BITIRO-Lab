# BITIRO Lab v4 — Entrega visual

## Cambios principales

- isotipo BITIRO recortado como asset real, sin crop por CSS
- header compacto y navegación de producto
- Explorer con fondo técnico sutil, hero más editorial y progreso integrado
- learning path conectado, con estados y microinteracciones
- S01 protagonista tratada como laboratorio, no como card genérica
- editor con pestaña activa, target de runtime y tema Monaco BITIRO Night
- viewport del simulador con lenguaje de laboratorio técnico
- HUD de telemetría reorganizado como instrumento
- modo calibración con lectura activa y jerarquía clara
- runtime y feedback refinados
- motion CSS con propósito y soporte de prefers-reduced-motion
- sin cambios en runtime, física, parser ni API IROH

## Validación

En el entorno de generación no fue posible instalar las dependencias desde npm por bloqueo de red. Se ejecutó comprobación sintáctica con TypeScript sin resolución de módulos; no se detectaron errores de sintaxis en los archivos modificados. Ejecutar localmente:

```bash
pnpm install
pnpm test
pnpm build
pnpm dev --host 0.0.0.0 --port 5174
```
