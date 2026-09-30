# Fuentes y decisiones

## Prioridad aplicada
Librería local IROH V4 → actividades y presentaciones ROB002 → Figma actual → especificación.

Figma leído mediante get_design_context:
- Explorador: https://www.figma.com/design/246Vqfp58PjnddBhhwMHyX?node-id=12-2
- Simulador S01: https://www.figma.com/design/246Vqfp58PjnddBhhwMHyX?node-id=13-2

Se conserva tipografía IBM Plex, tarjetas claras, editor oscuro, amarillo y violeta. Se sustituyen posiciones absolutas por layouts adaptables, tamaños de control de al menos40px y navegación por teclado.

## S01: discrepancia entre plotter y mockup
El plotter real contiene un tronco central y una curva bifurcada, dos cuadrados rojos superiores y una barra negra inferior. No contiene la línea serpenteante ni una base roja inferior del mockup. La geometría real tiene prioridad.

El importador convierte las diez líneas/curvas negras del SVG a puntos en cm. Conserva los dos cuadrados rojos, normalizando el viewBox a100×140cm. Los logos no se convierten a colisiones. El renderer Canvas y los sensores consultan el mismo JSON.

Inicio (50,117) y caja (46,94,8,8) son configuración de laboratorio: el plotter no fija ubicación de la caja ni orientación del robot. La ficha AE1 presenta objetivos, pero no resuelve completamente qué base corresponde a esta versión del plotter. En el hito2 se adopta base izquierda para estímulo izquierdo y base derecha para estímulo derecho, conforme al recorrido simétrico. Ambas rutas están cubiertas por referencias de prueba. Es una decisión de laboratorio trazable; no se añade puntuación ni se afirma validación sobre hardware.

## Calibración física provisional
Separación de ruedas12cm, radio7cm y velocidad máxima28cm/s son parámetros de trabajo explícitos, no extraídos de la librería. Colisiones rígidas detienen el robot en la prueba manual. En ejecución de código, una colisión impide trasladarse pero permite giro y paso del tiempo; los motores siguen recibiendo la orden del alumno. El servo aplica un impulso a cajas móviles.

Lecturas analógicas se interpolan por distancia a la línea (negro395/blanco28). No hay ruido artificial. Los extremos de segmentos usan una aproximación circular en el modelo de sensores; el renderer conserva los linecaps originales. Confirmar extremos al calibrar. Sonar geométrico usa rayo frontal y objetos, todavía sin paredes ni cono. El estímulo IR es manual; la mayoría de tres muestras se aplica en el adapter. Las muestras usan el mismo estímulo y no añaden 200 µs al reloj gráfico. No hay detección IR geométrica en este hito.

## Material consultado
Se extrajeron los ocho ZIP de Desktop/mapas, leyendo actividades AE1, AE2, AE3, AE4, DI, AE6, CLSF y diapositivas S01; se inventariaron las demás presentaciones. S07 tiene presentación de repaso y no plotter.

S04 tiene dos PDF. La miniatura usa el archivo de nombre plotter100x200, conservando el otro como referencia en los originales. Antes de implementar S04 se deben comparar ambas variantes.

Las miniaturas son renders completos de los PDF entregados. No se han fabricado logos. La app no usa PDF/SVG para la física ni requiere red para fuentes o Monaco después de servirse.

## Atribución
Material de Robótica Educativa de Fundación Gabriel & Mary Mustakis y universidades socias; los documentos declaran CC BY-NC-SA. Miniaturas y geometría derivada se conservan bajo esa atribución/licencia. El proyecto se entrega para trabajo local; no se ha publicado. La biblioteca Knight Robotics tiene aviso BSD de tres cláusulas; no se redistribuye su implementación en el código de la app.

## Hito 2: runtime y criterio de llegada

Se conservan React, TypeScript, Vite, Router, Monaco, Canvas y el Worker existente. Parser e intérprete están separados de física y React. Los generadores suspensos conservan scopes y cursor de ejecución. Cada tramo tiene presupuesto; cualquier error detiene motores y genera diagnóstico tipado. Pausar congela runtime, servo, caja, física y reloj. La velocidad multiplica el tiempo real que recibe step(ms), nunca las órdenes de motor.

La llegada se calcula cuando el centro del robot está dentro de un cuadrado rojo. Se emite FINISH_REACHED al entrar; no detiene el programa. La interfaz distingue llegada y motores detenidos. El test activa ambos IR después de la llegada, como intervención externa del usuario, no como función automática del motor.

Caja inicial 8×8 cm; pivote del brazo a 6 cm, longitud 14 cm, 300°/s, impulso lateral 60 cm/s y amortiguación exponencial de 3/s. Contacto por cápsula aproximada, un impulso por caja y orden de servo. No hay física general de sólidos, fricción medida, rebote ni masa real. El cuerpo del robot no empuja la caja: el golpe es quien desplaza el obstáculo. Las trayectorias son reproducibles.

Las referencias privadas usan exclusivamente la API pública y la lectura del sensor central para seguir el borde de línea; no consultan posiciones, tiempo de llegada ni funciones secretas. Ambas alcanzan su base aproximadamente a 26,2 s simulados y se detienen al recibir ambos IR. Puede haber contacto lateral transitorio en este modelo provisional; no se atraviesa la caja.

Los eventos conservan hasta 256 registros; snapshots incluyen los últimos 12. IR_READ se emite en la primera lectura y cuando cambia su valor para evitar inundar el feedback. Las pruebas recolectan eventos mientras avanza la escena. No hay analítica externa.

La revisión del código comprueba sintaxis, funciones y aridad. Variables inexistentes, tipos incompatibles, argumentos fuera de rango y división por cero se detectan durante ejecución y se marcan en Monaco. Una revisión sintáctica válida no equivale a comprobar todas las rutas del programa.
