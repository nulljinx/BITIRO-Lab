import {it,expect} from 'vitest';
import {Parser} from '../../simulator/runtime/parser/Parser';
import {validate} from '../../simulator/runtime/parser/validate';
import {create,program} from './helpers';
it('parses globals, functions, branches, nested loops and locations',()=>{
 const ast=new Parser('int n=0;\nvoid mover(int v){if(v>0){avanzar(v);}else{detenerse();}}\nvoid setup(){for(int i=0;i<3;i++){n+=i;} while(n>0){n--;if(n==1)break;}}\nvoid loop(){mover(20);}').parse();validate(ast);expect(ast.globals).toHaveLength(1);expect(ast.functions[0].loc.startLine).toBe(2);
});
it.each(['void setup(){','void','void setup(){}','void setup(){break;} void loop(){}','void setup(){int n=1} void loop(){}'])('reports malformed syntax with a source position',source=>{const {runtime}=create(source);expect(runtime.diagnostic?.kind).toBe('SyntaxError');expect(runtime.diagnostic?.line).toBeGreaterThan(0);});
it('unknown API provides correction and invalid arity is separate',()=>{expect(create(program('leerSensorIRIzquierdo();')).runtime.diagnostic).toMatchObject({kind:'UnknownFunctionError',message:expect.stringContaining('leerSensorObstaculoIzquierdo')});expect(create(program('avanzar();')).runtime.diagnostic?.kind).toBe('ArgumentError');});
it('review does not start or mutate a scene',()=>{const {engine,runtime}=create(program(''));runtime.command({type:'reset'});const before=engine.snapshot();expect(runtime.review(program('avanzar(30);'))).toEqual([]);expect(engine.snapshot()).toEqual(before);});
it('accepts comma-separated declarations globally, locally and in for initializers',()=>{
 const source='int a=1,b=2,c; const int x=3,y=4; void setup(){int si=10,sc=20,sd=30;for(int i=0,j=2;i<j;i++){c+=i;}} void loop(){}';
 const ast=new Parser(source).parse();validate(ast);
 expect(ast.globals.map(item=>item.name)).toEqual(['a','b','c','x','y']);
 expect(ast.functions.find(fn=>fn.name==='setup')).toBeTruthy();
});
it('accepts user functions with parameters and return values even when declared after loop',()=>{
 const source='void setup(){int r=suma(2,3);usar(r);} void loop(){} void usar(int valor){avanzar(valor);} int suma(int a,int b){return a+b;}';
 const ast=new Parser(source).parse();expect(()=>validate(ast)).not.toThrow();
});
it('accepts continue only inside loops',()=>{
 expect(()=>validate(new Parser(program('for(int i=0;i<3;i++){if(i==1)continue;}')).parse())).not.toThrow();
 expect(create(program('continue;')).runtime.diagnostic?.kind).toBe('SyntaxError');
});
it('accepts logical AND and OR in sensor comparisons with the expected precedence',()=>{
 const source=program('int si=100,sc=300,sd=120,umbral=200;bool centrado=si<umbral && sc>umbral && sd<umbral;bool obstaculo=leerSensorObstaculoIzquierdo()==1 || leerSensorObstaculoDerecho()==1;if(centrado || obstaculo){detenerse();}');
 const ast=new Parser(source).parse();expect(()=>validate(ast)).not.toThrow();
});

