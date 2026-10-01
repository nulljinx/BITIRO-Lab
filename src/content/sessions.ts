export interface SessionDefinition {
  id:string; number:number; title:string; summary:string; concepts:string[];
  objectives:string[]; bonus:string; source:string; dimensions:string; interactive:boolean; trackAsset?:string;
}
export const sessions:SessionDefinition[]=[
 {id:'s01',number:1,title:'Seguir línea y mover obstáculo',summary:'Lee los IR al inicio, elige la ruta, sigue la línea con el sensor central y mueve el obstáculo al llegar a la base.',concepts:['IR','Línea','LCD','Umbral','Variables de estado'],objectives:['Leer el IR inicial y guardar la decisión de ruta.','Seguir la línea con el sensor central usando un umbral.','Llegar a la base correspondiente.','Mover el obstáculo hacia el lado contrario.'],bonus:'',source:'ROB-002-S01-AE1 · Slide 2026',dimensions:'100 × 140 cm',interactive:true,trackAsset:'/tracks/s01.png'},
 {id:'s02',number:2,title:'Tres sensores y elección de base',summary:'Sigue la línea de forma fluida, detecta la intersección y elige una de tres bases.',concepts:['Variables de estado','3 sensores','Umbral','Intersección','IR'],objectives:['Seguir la línea con los tres sensores.','Detenerse un instante en la intersección.','Elegir Base 1 con IR derecho, Base 2 con IR izquierdo o Base 3 con ambos.','Detenerse al llegar a la base.'],bonus:'Mostrar en tiempo real los valores de los sensores en la LCD.',source:'ROB-002-S02-AE2 · Slide 2025',dimensions:'100 × 200 cm',interactive:true,trackAsset:'/tracks/s02.png'},
 {id:'s03',number:3,title:'Contadores y ciclo while',summary:'Sigue la pista con tres sensores, cuenta obstáculos con sonar y responde a las intersecciones cambiando de sentido.',concepts:['Contadores','Ciclo while','Sonar','3 sensores','Intersecciones'],objectives:['Recorrer la pista siguiendo la línea con los tres sensores.','Detectar y contar 3 obstáculos durante el recorrido.','Mostrar correctamente en la LCD la cantidad de obstáculos detectados.','Responder a 3 intersecciones cambiando el sentido del recorrido en 180°.'],bonus:'Resuelve el desafío sin contar dos veces el mismo obstáculo cuando permanece detectado.',source:'ROB-002-S03-Slide-2025 · desafío y pauta de evaluación',dimensions:'100 × 180 cm',interactive:true,trackAsset:'/tracks/s03.png'},
 {id:'s04',number:4,title:'Gaps y funciones',summary:'Cruza interrupciones de la línea, reutiliza rutinas mediante funciones y combina el seguidor de tres sensores con un tramo recto controlado por while.',concepts:['Gap','Funciones','Ciclo while','3 sensores'],objectives:['Seguir la línea usando los tres sensores.','Cruzar correctamente el primer gap.','Atravesar el segundo gap usando while y alcanzar la segunda intersección.','Detenerse al llegar a la tercera intersección.'],bonus:'Organiza el programa en funciones para evitar repetir bloques de código.',source:'ROB-002-S04-Slide-2025 · desafío y pauta de evaluación',dimensions:'100 × 200 cm',interactive:true,trackAsset:'/tracks/s04.png'},
 {id:'s05',number:5,title:'Sensores IR y elección de ruta',summary:'Próxima práctica: contar o interpretar estímulos IR y elegir una trayectoria según la información recibida.',concepts:['IR','Contadores','Decisiones'],objectives:[],bonus:'',source:'Tema identificado en material de continuidad; pista y criterios pendientes de validación',dimensions:'—',interactive:false},
 {id:'s06',number:6,title:'Sonar, cajas y velocidad',summary:'Próxima práctica: usar distancia de sonar para adaptar velocidad y responder ante objetos.',concepts:['Sonar','Distancia','Velocidad'],objectives:[],bonus:'',source:'Tema identificado en material de continuidad; pista y criterios pendientes de validación',dimensions:'—',interactive:false},
 {id:'s07',number:7,title:'Repaso integrado',summary:'Sesión de práctica para combinar sensores, decisiones, funciones y control del IROH.',concepts:['Repaso','Funciones','Sensores'],objectives:[],bonus:'',source:'Sesión identificada como repaso; no hay plotter S07 propio confirmado',dimensions:'—',interactive:false},
 {id:'s08',number:8,title:'Clasificación y desafío final',summary:'Desafío integrador para aplicar sensores, estado, decisiones y funciones en una misión más completa.',concepts:['Clasificación','Integración','Decisiones'],objectives:[],bonus:'',source:'Tema identificado en material de continuidad; pista y criterios pendientes de validación',dimensions:'—',interactive:false}
];
export function starterCode(session:SessionDefinition) {
 if(session.id==='s03')return `// BITIRO Lab · Sesión 03
// Desafío: contadores y ciclo while
#include <KnightRoboticsLibs_Iroh.h>

int sensorI;
int sensorC;
int sensorD;
int distancia;

int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

int contadorObstaculos = 0;

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {
  // 1) Lee los tres sensores y el sonar.

  // 2) Muestra la distancia del sonar en la LCD.

  // 3) Cuando detectes un obstáculo, súmalo al contador
  //    y muestra también el total en la LCD.

  // 4) Usa while para no contar varias veces el mismo obstáculo.

  // 5) Si I, C y D ven negro, realiza un giro de 180°.

  // 6) En los demás casos, sigue la línea con los tres sensores.
}
`;
 if(session.id==='s02')return `// BITIRO Lab · Sesión 02
// Tres sensores, intersección y elección de base
#include <KnightRoboticsLibs_Iroh.h>

int sensorI;
int sensorC;
int sensorD;

int irIzq;
int irDer;

int destino = 0;
int estado = 0;
int cruceSuperado = 0;

// Reemplaza estos valores por los umbrales que obtuviste al calibrar.
int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {
  // 1) Lee los IR y guarda la base en una variable de estado.
  //    DER -> Base 1 | IZQ -> Base 2 | ambos -> Base 3.

  // 2) Lee los tres sensores de línea.

  // 3) Programa los casos vistos en clase:
  //    centro -> avanzar
  //    derecha -> girar a la derecha
  //    izquierda -> girar a la izquierda
  //    los tres en negro -> intersección

  // 4) En la intersección, detente un instante y toma el camino elegido.

  // 5) Detente al llegar a la base final.
}
`;
 if(session.id==='s04')return `// BITIRO Lab · Sesión 04
// Gaps y funciones
#include <KnightRoboticsLibs_Iroh.h>

int sensorI;
int sensorC;
int sensorD;

int umbralI = 200;
int umbralC = 200;
int umbralD = 200;

int intersecciones = 0;
int terminado = 0;

void leerSensores() {
  sensorI = leerSensorLineaIzquierdo();
  sensorC = leerSensorLineaCentral();
  sensorD = leerSensorLineaDerecho();
}

void setup() {
  inicializarMovimiento();
  inicializarSensores();
}

void loop() {
  // 1) Lee los tres sensores usando leerSensores().

  // 2) Mantén los tres casos del seguidor de línea.

  // 3) Agrega el nuevo caso GAP: I, C y D en blanco.

  // 4) En la primera intersección detente 1 segundo.

  // 5) Cruza el segundo gap con while hasta detectar la segunda intersección.

  // 6) Continúa siguiendo la línea y detente en la tercera intersección.
}
`;
 return `// BITIRO Lab · Sesión ${String(session.number).padStart(2,'0')}
// ${session.title}
#include <KnightRoboticsLibs_Iroh.h>

void setup() {
  inicializarMovimiento();
  inicializarSensores();
  inicializarPantalla();
}

void loop() {
  // Divide el desafío en tareas pequeñas.
  // Escribe aquí tu programa.
}
`;
}
