import type {RuntimeValue,ValueType,SourceLocation} from '../runtime-types';
import {LanguageError} from './RuntimeError';
import {LIMITS} from '../runtime-limits';
interface Cell {type:ValueType;value:RuntimeValue;constant:boolean}
export function numeric(v:RuntimeValue,loc:SourceLocation):number {
 if(v.type==='string'||v.type==='void')throw new LanguageError('ArgumentError','Esta operación necesita un número.',loc);
 return Number(v.value);
}
export function truth(v:RuntimeValue,loc:SourceLocation){return numeric(v,loc)!==0;}
export function cast(v:RuntimeValue,type:ValueType,loc:SourceLocation):RuntimeValue {
 if(type==='void')return {type,value:null};
 if(type==='string'){if(v.type!=='string')throw new LanguageError('ArgumentError','Se esperaba un texto.',loc);return {...v};}
 let value=numeric(v,loc);if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)throw new LanguageError('RuntimeError','El resultado numérico es demasiado grande.',loc);
 if(type==='bool')return {type,value:value!==0};
 if(type!=='float')value=Math.trunc(value);
 return {type,value};
}
export class Environment {
 private cells=new Map<string,Cell>();
 constructor(readonly parent:Environment|null=null,private budget={count:0}){}
 child(){return new Environment(this,this.budget);}
 declare(name:string,type:ValueType,value:RuntimeValue,constant:boolean,loc:SourceLocation){
  if(this.cells.has(name))throw new LanguageError('RuntimeError',`La variable "${name}" ya existe en este bloque.`,loc);
  if(this.budget.count>=LIMITS.variables)throw new LanguageError('ExecutionLimitError','Hay demasiadas variables activas (máximo 256).',loc);
  this.cells.set(name,{type,value:cast(value,type,loc),constant});this.budget.count++;
 }
 private find(name:string,loc:SourceLocation):Cell {const cell=this.cells.get(name);if(cell)return cell;if(this.parent)return this.parent.find(name,loc);throw new LanguageError('RuntimeError',`La variable "${name}" no está definida.`,loc);}
 get(name:string,loc:SourceLocation):RuntimeValue{return {...this.find(name,loc).value};}
 set(name:string,value:RuntimeValue,loc:SourceLocation):RuntimeValue {const cell=this.find(name,loc);if(cell.constant)throw new LanguageError('RuntimeError',`"${name}" es constante y no se puede cambiar.`,loc);cell.value=cast(value,cell.type,loc);return {...cell.value};}
 dispose(){this.budget.count-=this.cells.size;this.cells.clear();}
}
