import {it,expect} from 'vitest';
import {create,program} from './helpers';
it('evaluates scopes, functions, arithmetic, conditions, for, while and short circuit',()=>{
 const {engine,runtime}=create(`int n=7; int suma(int v){return v+n;} void setup(){inicializarPantalla();borrarPantalla();int n=3;{int n=9;n++;} int r=0;for(int i=0;i<4;i++){r+=i;}while(r>4){r--;if(r==5)break;}bool seguro=false && (1/0);if(!seguro && n==3)r=suma(r);escribirPantalla(0,0,r);escribirPantalla(0,1,7/2);}void loop(){}`);
 runtime.step(10);expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0].trim()).toBe('12');expect(engine.robot.lcd[1].trim()).toBe('3');
});
it('setup runs once, loop runs once per tick and fractional steps accumulate',()=>{const {engine,runtime}=create('int n=0;void setup(){inicializarPantalla();borrarPantalla();n++;}void loop(){escribirPantalla(0,0,n);n++;}');runtime.step(5);expect(engine.ticks).toBe(0);runtime.step(5);expect(engine.robot.lcd[0].trim()).toBe('1');runtime.step(20);expect(engine.robot.lcd[0].trim()).toBe('3');});
it('pausing freezes program, physics, servo, box and simulated clock',()=>{const {engine,runtime}=create(program('inicializarGolpe();moverServoGolpe(1);pausa(1000);avanzar(40);'),false,117);runtime.step(50);runtime.command({type:'pause'});const before=engine.snapshot();runtime.step(10000);expect(engine.snapshot()).toEqual(before);runtime.command({type:'resume'});runtime.step(50);expect(engine.robot.simTimeMs).toBe(100);expect(engine.obstacles[0].x).toBeGreaterThan(before.obstacles[0].x);});
it('reset cancels waits, restores all actuators and variables',()=>{const code=program('inicializarPantalla();inicializarGolpe();moverServoGolpe(1);pausa(1000);');const {engine,runtime}=create(code,false);runtime.step(400);runtime.command({type:'reset'});expect(engine.robot.simTimeMs).toBe(0);expect(engine.robot.strikeServoAngle).toBe(90);expect(engine.robot.lcdBacklight).toBe(false);expect(engine.obstacles[0].x).toBe(46);expect(engine.events).toEqual([]);runtime.step(2000);expect(engine.ticks).toBe(0);runtime.run(code);runtime.step(10);expect(engine.robot.lcdBacklight).toBe(true);});
it.each([.5,1,2])('speed %s preserves all simulated timing',speed=>{const code=program('inicializarPantalla();avanzar(0);pausa(300);detenerse();escribirPantalla(0,1,millis());');const a=create(code),b=create(code);a.runtime.command({type:'speed',value:speed});for(let wall=0;wall<600/speed;wall+=10)a.runtime.step(10*speed);b.runtime.step(600);expect(a.engine.snapshot()).toEqual(b.engine.snapshot());});
it.each([['int x=1/0;','RuntimeError'],['x=1;','RuntimeError'],['const int x=1;x++;','RuntimeError'],['moverServoGolpe(9);','ArgumentError']])('safe runtime diagnostics for %s',(code,kind)=>{const {engine,runtime}=create(program(code));runtime.step(10);expect(runtime.diagnostic?.kind).toBe(kind);expect(engine.status).toBe('error');expect(engine.robot.leftMotor).toBe(0);});
it('runs comma-separated declarations and custom helper functions',()=>{
 const {engine,runtime}=create(`int base=4,extra=3,total=0;void setup(){inicializarPantalla();borrarPantalla();int a=1,b=2,c=a+b;total=sumar(base,extra)+c;escribirPantalla(0,0,total);}void loop(){}int sumar(int x,int y){return x+y;}`);
 runtime.step(20);expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0].trim()).toBe('10');
});
it('continue skips the rest of the loop body and preserves for updates',()=>{
 const {engine,runtime}=create(program('inicializarPantalla();borrarPantalla();int suma=0;for(int i=0;i<5;i++){if(i==2)continue;suma+=i;}escribirPantalla(0,0,suma);'));
 runtime.step(30);expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0].trim()).toBe('8');
});
it('evaluates && and || for combined comparisons and preserves short-circuit behavior',()=>{
 const {engine,runtime}=create(`void setup(){inicializarPantalla();borrarPantalla();int si=100,sc=350,sd=110,umbral=200;bool linea=si<umbral && sc>umbral && sd<umbral;bool seguro=true || (1/0);bool evitaError=false && (1/0);if(linea && seguro && !evitaError){escribirPantalla(0,0,1);}else{escribirPantalla(0,0,0);}}void loop(){}`);
 runtime.step(30);expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0].trim()).toBe('1');
});
it('evaluates OR when either sensor condition is true',()=>{
 const {engine,runtime}=create(`void setup(){inicializarPantalla();borrarPantalla();int izq=0,der=1;if(izq==1 || der==1){escribirPantalla(0,0,1);}else{escribirPantalla(0,0,0);}}void loop(){}`);
 runtime.step(20);expect(runtime.diagnostic).toBeNull();expect(engine.robot.lcd[0].trim()).toBe('1');
});

