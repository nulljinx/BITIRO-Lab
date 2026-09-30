import type {Program,Expr,Statement,FunctionNode} from '../parser/ast';
import type {Execution,RuntimeValue,SourceLocation} from '../runtime-types';
import {numberValue,voidValue} from '../runtime-types';
import {Environment,numeric,truth,cast} from './Environment';
import {binary} from './operators';
import {LanguageError} from './RuntimeError';
import {LIMITS} from '../runtime-limits';
export interface RuntimeAdapter {call(name:string,args:RuntimeValue[],loc:SourceLocation):Execution}
type Flow={kind:'return';value:RuntimeValue}|{kind:'break'}|{kind:'continue'}|undefined;
export class Interpreter {
 readonly globals=new Environment();private functions=new Map<string,FunctionNode>();private callDepth=0;
 constructor(private program:Program,private adapter:RuntimeAdapter){program.functions.forEach(f=>this.functions.set(f.name,f));}
 *run():Execution<void>{
  for(const declaration of this.program.globals)yield* this.execute(declaration,this.globals);
  yield* this.invoke('setup',[],this.functions.get('setup')!.loc);
  while(true){yield* this.invoke('loop',[],this.functions.get('loop')!.loc);yield {kind:'loop-boundary'};}
 }
 private *invoke(name:string,args:RuntimeValue[],loc:SourceLocation):Execution{
  const fn=this.functions.get(name);if(!fn)return yield* this.adapter.call(name,args,loc);
  if(++this.callDepth>LIMITS.callDepth){this.callDepth--;throw new LanguageError('ExecutionLimitError','Hay demasiadas llamadas anidadas (máximo 32).',loc);}
  const env=this.globals.child();
  try{fn.params.forEach((p,i)=>env.declare(p.name,p.type,args[i],false,p.loc));const result=yield* this.execute(fn.body,env);if(result?.kind==='return')return cast(result.value,fn.returnType,loc);if(fn.returnType!=='void')throw new LanguageError('RuntimeError',`La función "${name}" debe devolver un valor.`,loc);return voidValue;}finally{env.dispose();this.callDepth--;}
 }
 private *evaluate(node:Expr,env:Environment):Execution{
  yield {kind:'instruction',loc:node.loc};
  switch(node.kind){
   case 'literal':return {...node.value};
   case 'variable':return env.get(node.name,node.loc);
   case 'call':{const args:RuntimeValue[]=[];for(const arg of node.args)args.push(yield* this.evaluate(arg,env));return yield* this.invoke(node.name,args,node.loc);}
   case 'assign':{const value=yield* this.evaluate(node.value,env);return env.set(node.name,node.op==='='?value:binary(node.op[0],env.get(node.name,node.loc),value,node.loc),node.loc);}
   case 'binary':{
    const a=yield* this.evaluate(node.left,env);
    if(node.op==='&&'&&!truth(a,node.loc))return {type:'bool',value:false};
    if(node.op==='||'&&truth(a,node.loc))return {type:'bool',value:true};
    const b=yield* this.evaluate(node.right,env);
    if(node.op==='&&'||node.op==='||')return {type:'bool',value:truth(b,node.loc)};
    return binary(node.op,a,b,node.loc);
   }
   case 'unary':{
    const a=yield* this.evaluate(node.argument,env);
    if(node.op==='!')return {type:'bool',value:!truth(a,node.loc)};
    if(node.op==='++'||node.op==='--'){
     if(node.argument.kind!=='variable')throw new LanguageError('RuntimeError','Solo se puede incrementar una variable.',node.loc);
     const result=env.set(node.argument.name,binary(node.op==='++'?'+':'-',a,numberValue(1),node.loc),node.loc);return node.postfix?a:result;
    }
    return {type:a.type==='float'?'float':'int',value:numeric(a,node.loc)*(node.op==='-'?-1:1)};
   }
  }
 }
 private *execute(node:Statement,env:Environment):Execution<Flow>{
  yield {kind:'instruction',loc:node.loc};
  switch(node.kind){
   case 'block':{const child=env.child();try{for(const statement of node.statements){const flow=yield* this.execute(statement,child);if(flow)return flow;}}finally{child.dispose();}break;}
   case 'declaration':env.declare(node.name,node.type,node.value?yield* this.evaluate(node.value,env):numberValue(0),node.constant,node.loc);break;
   case 'declaration-group':for(const declaration of node.declarations)yield* this.execute(declaration,env);break;
   case 'expression':yield* this.evaluate(node.expression,env);break;
   case 'if':if(truth(yield* this.evaluate(node.condition,env),node.loc))return yield* this.execute(node.then,env);else if(node.otherwise)return yield* this.execute(node.otherwise,env);break;
   case 'while':while(truth(yield* this.evaluate(node.condition,env),node.loc)){const flow=yield* this.execute(node.body,env);if(flow?.kind==='return')return flow;if(flow?.kind==='break')break;}break;
   case 'for':{
    const child=env.child();try{if(node.init)yield* this.execute(node.init,child);while(!node.condition||truth(yield* this.evaluate(node.condition,child),node.loc)){
     yield {kind:'instruction',loc:node.loc};const flow=yield* this.execute(node.body,child);if(flow?.kind==='return')return flow;if(flow?.kind==='break')break;if(node.update)yield* this.evaluate(node.update,child);
    }}finally{child.dispose();}break;
   }
   case 'return':return {kind:'return',value:node.value?yield* this.evaluate(node.value,env):voidValue};
   case 'break':return {kind:'break'};
   case 'continue':return {kind:'continue'};
  }
 }
}
