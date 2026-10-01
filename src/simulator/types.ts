export interface Point { x: number; y: number }
export interface LinePath { id: string; widthCm: number; lineCap: string; points: Point[] }
export interface Zone extends Point { id: string; label: string; width: number; height: number; kind?: 'finish-red'|'finish-green' }
export interface TrackMarker extends Point { id: string; label?: string; width: number; height: number; kind: 'start-red' }
export interface MissionZone extends Point { id: string; width: number; height: number }
export interface ScenarioIntersection extends Point { id:string }
export interface Obstacle extends Point { id: string; width: number; height: number; movable: boolean; blocking?: boolean }
export interface TrackDefinition {
  id: string; physicalWidthCm: number; physicalHeightCm: number; source: string;
  sourceSha256: string; paths: LinePath[]; finishZones: Zone[]; markers?: TrackMarker[]; missionZones?: MissionZone[];
  start: Point & { heading: number }; obstacles: Obstacle[]; notes: string;
  startLabel?: { text: string; x: number; y: number };
}
export type Status = 'idle' | 'compiling' | 'running' | 'paused' | 'finished' | 'error';
export type LineThresholds=[number,number,number];
export interface RobotState extends Point {
  heading: number; leftMotor: number; rightMotor: number;
  lineLeft: number; lineCenter: number; lineRight: number;
  irLeft: boolean; irRight: boolean; sonarCm: number;
  lcd: [string, string]; lcdBacklight:boolean; strikeServoPosition:-1|0|1; strikeServoAngle:number; strikeServoAttached:boolean; buttonPressed: boolean; simTimeMs: number;
}
export interface DynamicObstacle extends Obstacle {vx:number;vy:number}
export type EventPayload =
 | {type:'PROGRAM_STARTED'|'PROGRAM_PAUSED'|'PROGRAM_FINISHED'|'LINE_LOST'|'LINE_FOUND'}
 | {type:'OBSTACLE_DETECTED';distance:number;obstacleId?:string}
 | {type:'OBSTACLE_HIT'|'OBSTACLE_MOVED';obstacleId:string;side:'left'|'right'}
 | {type:'FINISH_REACHED';zoneId:string}
 | {type:'LCD_UPDATED';rows:[string,string]}
 | {type:'LINE_SENSOR_READ';side:'left'|'center'|'right'}
 | {type:'IR_READ';side:'left'|'right';active:boolean}
 | {type:'BUTTON_READ';active:boolean}
 | {type:'RUNTIME_ERROR';message:string};
export type SimulationEvent=EventPayload & {sequence:number;timeMs:number};
export interface Snapshot {mission:import('./MissionEvaluator').MissionEvidence;robot:RobotState;status:Status;feedback:string;ticks:number;collisions:number;obstacles:DynamicObstacle[];scenarioIntersections:ScenarioIntersection[];events:SimulationEvent[];instructions:number;finish:{zoneId:string|null;arrived:boolean;stopped:boolean}}
export type WorkerCommand=Command|{type:'configure-track';trackId:string}|{type:'set-line-thresholds';values:LineThresholds}|{type:'set-s03-layout';obstacles:Point[];intersections:Point[]}|{type:'load-program';source:string;requestId:number}|{type:'run-program';source:string;requestId:number}|{type:'stop-program'};
export type WorkerResponse=
 | {type:'track-ready';trackId:string;snapshot:Snapshot}
 | {type:'snapshot';snapshot:Snapshot}
 | {type:'compile-ok';requestId:number;running:boolean}
 | {type:'compile-error';requestId:number;diagnostics:import('./runtime/runtime-types').Diagnostic[]}
 | {type:'runtime-error';diagnostic:import('./runtime/runtime-types').Diagnostic}
 | {type:'program-finished'};
export type Command =
  | { type: 'motors'; left: number; right: number }
  | { type: 'reset' | 'pause' | 'resume' | 'stop' }
  | { type: 'speed'; value: number }
  | { type: 'ir'; side: 'left' | 'right'; value: boolean }
  | { type: 'button'; value: boolean }
  | { type: 'pose'; x: number; y: number; heading: number };
