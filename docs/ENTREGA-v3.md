# BITIRO Lab v3 · Entrega Premium UI

Especificación aplicada: `BITIRO-UIUX-Premium-Spec-v1.md` sobre `BITIRO-Lab-Web-v2-UNAMBIGUOUS.zip`.
Fecha: 17 de septiembre de 2026.

## Resultado

Se refactorizó la capa visual y de interacción para convertir el explorador en un recorrido educativo y S01 en un espacio de trabajo de código y simulación. Se usaron los activos BITIRO originales, IBM Plex y una sola familia de iconos: Lucide React. No se dibujaron SVG a mano ni se usaron emojis como iconos.

## Aplicación de la especificación

| Área | Implementación |
|---|---|
| Fundaciones | tokens.css con paleta, espaciado, tipografía, radios, sombras, motion y z-index. CSS separado por dominio. |
| Header | Sticky, 72 px, marca compacta, nivel, breadcrumbs y guía. Indicador de marca de 2 px. |
| Explorador | Hero editorial; progreso real de sesiones exploradas; S01 protagonista y filas agrupadas por currículo. |
| Workspace | Split 40/60 desde 1440 px y 42/58 entre 1024–1439. Altura ajustada a la ventana y scroll interno. |
| Editor | Archivo y guardado, descarga, Monaco protagonista, misión colapsable, revisar/ejecutar y detener durante ejecución. |
| Viewport | Zoom 75–200%, ajustar, herramientas compactas. Misma transformación para dibujo y arrastre. |
| Robot | Gráfica existente preservada con acento BITIRO; cursor grab/grabbing, orientación y sensor seleccionado en calibración. |
| Telemetría | HUD con línea, sonar, LCD, IR, pulsador y servo. Pulso breve al cambiar una lectura. |
| Calibración | Tres registros independientes de mínimo/máximo, umbrales editables, sensor activo, giro ±15°, muestras, salida y guardado local. |
| Feedback | Listo, ejecutando, pausa, atención, error, fin de programa y detención en base con icono y texto. |
| Responsive | Tablet con pestañas Código/Simulador; móvil con misión, código, ejecución y pista en flujo vertical. Telemetría en bottom sheet modal. |
| Accesibilidad | Foco visible, nombres de controles, teclado para calibrar, diálogos nativos, cierre Escape y reduced-motion. |

Las animaciones usan CSS: no fue necesario añadir Framer Motion. Se mantiene React, TypeScript, Vite, Router, Monaco y Canvas. No se añadió Tailwind.

## Interacción de calibración

Activar Calibrar detiene el programa para inspeccionar la pista. El robot se puede arrastrar, ubicar tocando la pista o mover con flechas; Shift incrementa el paso. Cada sensor reúne sus propios extremos. Tras observar blanco y negro se propone el punto medio, que puede ajustarse antes de guardar.

Los umbrales se guardan localmente como referencias y se usan para mostrar el sensor activo. **No alteran el código del alumno ni la lectura analógica del runtime**: el estudiante incorpora sus comparaciones. Se informa esta distinción junto a la acción de guardado. Los datos persisten al recargar y los controles rechazan umbrales fuera de 0–1023.

## Lógica preservada

Se compararon byte a byte 37 archivos de motor, runtime, adapter, sensores, Worker, API, pista y activos contra el ZIP de entrada. Registro: `preservacion-v2.json`.

Solo el renderer cambia en el subsistema de simulación: zoom, transformación de coordenadas y presentación del sensor en calibración. No se cambiaron velocidades, frenos, colisiones, esperas, sensores ni geometría de pista. Los estados pedagógicos no anuncian una misión completa sin un evaluador completo: la llegada y la detención se comunican de forma diferenciada.

## Pruebas

| Comando | Resultado |
|---|---|
| `pnpm test` | 84 pruebas correctas en 8 archivos |
| `pnpm test:e2e` | 9 pruebas correctas en Microsoft Edge |
| `pnpm build` | TypeScript y Vite correctos, 2520 módulos |

Se comprueban ventanas de 1920×1080, 1440×900, 1280×900, 1024×900, 900×900 y 390×900. En escritorio no hay desbordamiento vertical de la página. Las pruebas cubren persistencia, ejecución, pausa/continuación, reinicio, errores Monaco, guía, zoom, arrastre, teclado, umbrales persistentes, telemetría móvil y movimiento reducido.

La primera ejecución detectó cuatro pruebas heredadas incompatibles con la nueva salida y=130 del ZIP v2. Se adaptaron los escenarios de golpe a una pose cercana explícita y las dos referencias S01 para aproximarse mediante sonar antes de seguir la línea. **Se conservó la salida oficial de v2 y la física.** Las referencias completas izquierda y derecha vuelven a pasar sin debilitar sus comprobaciones de golpe, llegada y detención.

## Componentes y archivos principales

Nuevos: `Topbar.tsx` (incluye BrandLockup/LevelBadge), `Controls.tsx`, `Curriculum.tsx` (secciones, filas y protagonista), `SimulatorToolbar.tsx`, `TelemetryPanel.tsx` (HUD, LCD, SensorValue, StatusBadge y bottom sheet), `CalibrationPanel.tsx`, `RuntimeBar.tsx`, `FeedbackPanel.tsx`, `viewport.ts`, `tokens.css`, `explorer.css`, `workspace.css`, `viewport.test.ts` y `premium.spec.ts`.

Refactorizados: `App.tsx`, `Explorer.tsx`, `CodeEditor.tsx`, `Simulator.tsx`, `Arena.tsx`, `useSimulation.ts`, `Guide.tsx`, `CanvasRenderer.ts`, `global.css`. Se actualizaron metadatos, dependencia Lucide y pruebas de integración.

## Límites conservados

S01 es la simulación activa; las otras sesiones ofrecen material y editor. El progreso cuenta visitas, no aprobaciones. La física sigue siendo una aproximación educativa. El zoom se centra en la pista; Ajustar restaura la vista completa. No se añadieron backend, nube, login, telemetría externa ni funciones de administración.

La versión compilada funciona localmente sin descargas. El desarrollo con Vite puede requerir permisos de directorios superiores en el entorno restringido Windows; build y servidor de producción están verificados. Esta entrega no constituye validación comercial con usuarios ni certificación de accesibilidad.

## Capturas finales

- [Explorador](capturas-v3/explorador.png)
- [S01 escritorio](capturas-v3/s01-desktop.png)
- [S01 laptop](capturas-v3/s01-laptop.png)
- [S01 tablet](capturas-v3/s01-tablet.png)
- [S01 móvil](capturas-v3/s01-movil.png)
- [Calibración](capturas-v3/calibracion.png)
- [Telemetría móvil](capturas-v3/telemetria-movil.png)
- [Errores de código](capturas-v3/error-codigo.png)
