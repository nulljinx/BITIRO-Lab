# BITIRO Lab — Especificación UI/UX Premium v1

## Objetivo

Transformar la versión web actual de BITIRO Lab desde un prototipo funcional a un producto comercial con acabado profesional, coherente, reconocible y vendible.

La dirección visual debe sentirse diseñada por un equipo senior de producto, no como una colección de tarjetas o componentes genéricos.

La experiencia debe combinar:

- claridad y foco operacional
- lenguaje visual tecnológico propio
- progresión educativa comprensible
- microinteracciones útiles
- alta legibilidad
- sensación de software real, no de landing page

## Referencias de producto

Tomar inspiración conceptual, no copiar:

- **Linear**: jerarquía, densidad controlada, reducción de ruido visual, foco en la tarea.
- **Raycast**: superficies premium, rapidez percibida, controles compactos, claridad.
- **Framer**: motion sutil, transiciones limpias, profundidad visual sin exceso.
- **JetBrains Academy**: aprendizaje práctico, progresión, actividades orientadas a proyecto.

No replicar layouts ni identidades de estas marcas.

---

# 1. Principios visuales

## 1.1 BITIRO debe sentirse propio

Evitar:

- tarjetas blancas repetidas como patrón dominante
- sombras grandes en todos los componentes
- degradados en demasiados lugares
- bordes redondeados excesivamente grandes
- botones con apariencia SaaS genérica
- iconos emoji
- iconos dibujados manualmente
- SVG hechos a mano
- texto decorativo innecesario

Preferir:

- superficies continuas
- agrupación por jerarquía
- bordes de 1 px discretos
- contraste por tono, no solo por cajas
- espacios amplios en zonas principales
- densidad mayor en zonas operativas
- color BITIRO usado como acento, no como relleno constante

---

# 2. Sistema visual

## 2.1 Colores base

```css
--bitiro-ink-950: #071426;
--bitiro-ink-900: #0B1B32;
--bitiro-ink-800: #122742;

--bitiro-blue-600: #146BFF;
--bitiro-blue-500: #2B7FFF;

--bitiro-cyan-500: #16D9EE;
--bitiro-violet-500: #7658FF;

--bitiro-bg: #F5F7FB;
--bitiro-surface: #FFFFFF;
--bitiro-surface-muted: #F0F4F8;
--bitiro-border: #DCE4EE;

--bitiro-text: #10213B;
--bitiro-text-muted: #65758B;
--bitiro-text-soft: #8A98AA;

--bitiro-success: #1FA971;
--bitiro-warning: #D89614;
--bitiro-danger: #D74C5A;
```

El degradado de marca se usa solo en:

- indicador activo
- CTA principal
- detalles de marca
- estados importantes
- loading/splash

```css
background: linear-gradient(135deg, #16D9EE 0%, #146BFF 52%, #7658FF 100%);
```

No usar degradados como fondo de todas las tarjetas.

## 2.2 Tipografía

Mantener IBM Plex Sans e IBM Plex Mono.

Jerarquía:

```text
Display:       40–48 px / 1.05 / 600
H1 producto:   30–36 px / 1.15 / 600
H2 sección:    22–26 px / 1.2  / 600
H3:            16–18 px / 1.3  / 600
Body:          14–16 px / 1.55 / 400
Label:         11–12 px / 1.2  / 600
Micro:         10–11 px / 1.3  / 500
Code:          13–14 px IBM Plex Mono
```

Evitar mayúsculas en exceso. Reservarlas para labels cortos.

## 2.3 Radio

```text
6 px   controles muy pequeños
10 px  inputs / botones
14 px  paneles compactos
18 px  paneles principales
22 px  hero o contenedores grandes
```

Evitar 24–32 px en tarjetas pequeñas.

## 2.4 Sombras

Usar solo en capas que realmente flotan.

```css
--shadow-soft:
  0 1px 2px rgba(7,20,38,.04),
  0 8px 24px rgba(7,20,38,.06);

--shadow-float:
  0 10px 30px rgba(7,20,38,.10);
```

---

# 3. Iconografía

Usar una sola familia de iconos profesional.

Recomendación de implementación:

**Phosphor Icons** o **Lucide** mediante paquete React.

Reglas:

- no dibujar SVG manualmente
- stroke coherente
- 16 px para acciones secundarias
- 18 px para botones
- 20–22 px para navegación
- 24 px solo en áreas protagonistas
- evitar mezclar estilos filled/outline sin intención

Mapa sugerido:

```text
Guía                 BookOpen / BookOpenText
Sesiones              Route / Map
Código                 Code2
Ejecutar               Play
Pausar                 Pause
Reiniciar              RotateCcw
Calibrar               SlidersHorizontal
Sensores               ScanLine
Sonar                  Radar
LCD                    Monitor
Pulsador               CircleDot
Velocidad              Gauge
Descargar              Download
Revisar código         ScanSearch / CheckCircle
Éxito                  CircleCheck
Error                  CircleAlert
Información            Info
Volver                  ArrowLeft
Abrir                   ArrowUpRight
Debug                   Bug
```

---

# 4. Motion system

Instalar Framer Motion solo si no introduce conflicto con la arquitectura actual.

Duraciones:

```text
micro interaction:  120–160 ms
hover:              140–180 ms
panel enter:        220–280 ms
route transition:   280–360 ms
loading accents:    continuo, muy sutil
```

Curva:

```css
cubic-bezier(.22, 1, .36, 1)
```

Respetar:

```css
@media (prefers-reduced-motion: reduce)
```

## 4.1 Animaciones permitidas

- hover con translateY máximo -2 px
- cambio de borde / iluminación
- aparición de paneles con opacity + 6–10 px
- progreso animado
- lectura de sensor con pulso breve cuando cambia
- botón ejecutar cambia de estado
- transición de misión
- robot con pequeña sombra dinámica
- estados de éxito con feedback corto

## 4.2 Evitar

- blobs flotantes
- partículas
- zoom exagerado
- brillo permanente
- tarjetas flotando continuamente
- animaciones largas
- motion decorativo que distraiga

---

# 5. Header global

## Problema actual

El header parece una barra genérica de SaaS.

## Nuevo diseño

Altura desktop: 72 px.

Izquierda:

```text
[ isotipo ] BITIRO Lab
             Simulador de robótica educativa
```

Centro opcional en vista de misión:

```text
Sesiones / Intermedio / S01
```

Derecha:

```text
[ Robótica Intermedia ] [ Guía y conceptos ]
```

Cambios:

- quitar grandes espacios vacíos
- icono de guía real
- pill de nivel más compacta
- logo no debe dominar
- borde inferior 1 px
- gradiente BITIRO como indicador activo de 2 px máximo

Header sticky, con background ligeramente translúcido solo si el navegador lo soporta bien.

---

# 6. Explorador de sesiones

## 6.1 Hero

Reducir altura.

Actual:

```text
Práctica. Programa. Prueba otra vez.
```

Mantener concepto, pero hacerlo más editorial.

Estructura:

```text
Robótica Intermedia · 8 sesiones

Práctica. Programa.
Comprueba lo que sabes.

Repite los desafíos del taller con el IROH virtual.
Programa, ejecuta y corrige a tu ritmo.

[ Continuar S01 ]  [ Ver recorrido ]
```

A la derecha:

- progreso
- 0/8
- barra
- siguiente misión
- sin tarjeta gigante

## 6.2 Learning Path

No usar una cuadrícula de tarjetas idénticas.

Usar una composición tipo "mission timeline / curriculum map".

S01:
- protagonista
- preview grande
- estado
- habilidades
- CTA

S02–S08:
- filas compactas
- icono de habilidad
- número
- título
- conceptos
- estado
- acción al hover

Ejemplo:

```text
02   Sensores
     Tres sensores y elección de base
     IR · Intersecciones
                         Abrir →
```

Agrupar por progresión:

```text
Fundamentos
S01 S02

Control y decisiones
S03 S04 S05

Entorno
S06

Integración
S07 S08
```

Esto reduce la apariencia de dashboard generado.

---

# 7. Simulator / S01

Esta pantalla es el producto principal.

## 7.1 Layout

Desktop:

```text
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├───────────────────┬─────────────────────────────────────┤
│                   │                                     │
│ Editor            │ Simulator                           │
│ 38–40%            │ 60–62%                              │
│                   │                                     │
└───────────────────┴─────────────────────────────────────┘
```

No debe sentirse como una página larga.

Objetivo:

```text
height: calc(100vh - header)
```

Cada columna puede tener scroll interno cuando sea necesario.

## 7.2 Editor

Convertirlo en un "coding workspace".

Topbar interna:

```text
intermedio_s01.ino      Guardado
```

Toolbar:

```text
Revisar    Descargar    ...
```

Editor Monaco protagonista.

Parte pedagógica debajo:
- misión
- hints
- API relevante

Pero colapsable.

No mostrar tres tarjetas pedagógicas enormes permanentemente.

### CTA

Barra fija inferior dentro del editor:

```text
[ Revisar ]                       [ ▶ Ejecutar ]
```

Cuando corre:

```text
[ Detener ]                       ● Ejecutando
```

---

# 8. Viewport del simulador

## 8.1 Pista

Eliminar apariencia de "imagen dentro de una tarjeta".

Tratar la pista como un canvas técnico.

Viewport:

- fondo gris azulado muy claro
- regla / grid solo cuando aporta
- canvas centrado
- controles flotantes

Toolbar encima:

```text
S01 · 100 × 140 cm

[ - ] 100% [ + ]   [ Ajustar ]   [ Calibrar ]
```

## 8.2 Robot

El IROH debe sentirse integrado a la simulación.

Agregar:

- hover discreto si es arrastrable
- cursor grab
- cursor grabbing
- halo corto cuando se selecciona
- sombra suave
- indicador de orientación
- feedback visual de sensor solo en calibración/debug

No hacer robot brillante ni cartoon.

---

# 9. Telemetría

En vez de una columna de tarjetas grandes, usar un HUD compacto.

Ejemplo:

```text
Robot
● Detenido

Línea
IZQ   28
CTR  395
DER   28

Sonar
8 cm

LCD
┌────────────────────┐
│                    │
│                    │
└────────────────────┘

IR
● Izq.    ○ Der.
```

La telemetría debe sentirse técnica pero amigable.

Cuando cambia un valor:
- fondo parpadea 250 ms
- número usa transición de color
- no animar constantemente

---

# 10. Controles del simulador

Barra inferior:

```text
[ Reiniciar ] [ Velocidad 1x ] [ Pausar ]

● Detenido                           0.0 s
```

Botones manuales solo en:

```text
debug
o
modo calibración
```

No ensuciar experiencia estándar.

---

# 11. Calibración

Debe sentirse como una herramienta profesional.

Al activar:

```text
Modo calibración
Mueve el IROH sobre blanco, negro y bordes para registrar lecturas.
```

Panel lateral:

```text
Sensor        Mín      Máx      Umbral
Izquierdo     28       412      220
Centro        31       395      213
Derecho       27       401      214
```

Acciones:

```text
Limpiar muestras
Volver al inicio
Girar -15°
Girar +15°
Guardar umbrales
```

Robot draggable.

Mostrar claramente el sensor activo.

---

# 12. Feedback pedagógico

Reemplazar:

```text
¿Qué está pasando?
```

por un panel de estado contextual.

Estados:

```text
LISTO
Tu programa está preparado para ejecutarse.

EJECUTANDO
El IROH está siguiendo la pista.

ATENCIÓN
El sensor central perdió la línea.

ERROR DE CÓDIGO
Revisa la línea 18.

MISIÓN COMPLETADA
El robot llegó a la base correcta.
```

Usar color + icono + texto.

Nunca depender solo del color.

---

# 13. Estados de interacción

Todos los elementos interactivos deben tener:

```text
default
hover
active
focus-visible
disabled
loading
```

Focus:

```css
outline: 2px solid #2B7FFF;
outline-offset: 2px;
```

---

# 14. Responsive

## Desktop grande

≥ 1440 px

Split 40 / 60.

## Laptop

1024–1439 px

Split 42 / 58.

HUD puede compactarse.

## Tablet

768–1023 px

Tabs:

```text
Código | Simulador
```

No intentar meter ambos paneles estrechos.

## Móvil

< 768 px

Flujo vertical:

```text
Misión
Código
Ejecutar
Simulador
Estado
```

Telemetría en bottom sheet.

---

# 15. Componentes a crear/refactorizar

```text
AppShell
Topbar
BrandLockup
LevelBadge
IconButton
PrimaryButton
SecondaryButton

SessionHero
CurriculumSection
SessionRow
SessionFeatured

Workspace
EditorPanel
EditorToolbar
EditorBottomBar

SimulatorPanel
SimulatorToolbar
TrackViewport
RobotHUD
TelemetryPanel
RuntimeBar

CalibrationPanel
FeedbackPanel
StatusBadge
SensorValue
LCDDisplay
```

Evitar un único componente gigante.

---

# 16. Design tokens CSS

Crear:

```text
src/styles/tokens.css
```

Separar:

```text
colors
spacing
radii
shadows
typography
motion
z-index
```

Ejemplo spacing:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

No llenar CSS con valores aleatorios.

---

# 17. Implementación recomendada

Stack actual:

```text
React
TypeScript
Vite
Monaco
```

Mantenerlo.

Añadir solo si hace falta:

```text
lucide-react o @phosphor-icons/react
framer-motion
```

No introducir Tailwind si el proyecto no lo usa.

Mantener CSS modularizado.

---

# 18. Primera implementación

Prioridad:

```text
1. tokens visuales
2. iconos
3. header
4. explorer
5. simulator shell
6. editor
7. HUD
8. calibration UX
9. motion
10. responsive
```

No intentar animar antes de cerrar layout.

---

# 19. Criterios de aceptación visual

La nueva versión debe cumplir:

- al verla por primera vez no parece plantilla SaaS
- BITIRO tiene identidad propia
- no hay emojis usados como iconos
- no hay SVG manual
- ningún componente usa estilos improvisados
- el explorer parece currículo, no catálogo de cards
- el simulator parece una herramienta, no una página web
- el editor y simulador caben razonablemente en 1080p
- estados de hover/focus son consistentes
- animaciones tienen propósito
- funciona con prefers-reduced-motion
- no hay scroll vertical exagerado en S01 desktop
- calibración se entiende sin explicación externa
- el producto se percibe apto para venta

---

# 20. Criterio de producto

BITIRO Lab debe sentirse como:

> una herramienta educativa profesional que un colegio, academia, fundación o taller de robótica estaría dispuesto a licenciar.

No debe sentirse como:

> una demo universitaria, un dashboard genérico o una interfaz generada automáticamente.

---

# Resultado esperado

La siguiente versión debería verse como **BITIRO Lab v3 Premium UI**, manteniendo toda la lógica existente del simulador, runtime, pistas y API IROH, pero reemplazando la capa visual y de interacción por este sistema.
