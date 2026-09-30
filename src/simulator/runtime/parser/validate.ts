import type {Program,Expr,Statement} from './ast';
import {signatureFor} from '../signatures';
import {LanguageError} from '../interpreter/RuntimeError';
import {LIMITS} from '../runtime-limits';
export function validate(program:Program):void {
 const functions=new Map<string,number>();
 for(const f of program.functions){if(functions.has(f.name)||signatureFor(f.name))throw new LanguageError('SyntaxError',`La función "${f.name}" ya está definida o es parte de IROH.`,f.loc);if(new Set(f.params.map(p=>p.name)).size!==f.params.length)throw new LanguageError('SyntaxError','Hay parámetros con nombres repetidos.',f.loc);functions.set(f.name,f.params.length);}
 const nodes:Array<{node:Expr|Statement;depth:number}>=program.globals.map(node=>({node,depth:1}));
 program.functions.forEach(fn=>nodes.push({node:fn.body,depth:1}));
 while(nodes.length){const {node,depth}=nodes.pop()!;if(depth>LIMITS.astDepth)throw new LanguageError('ExecutionLimitError','La expresión tiene demasiados niveles. Divídela en pasos.',node.loc);
  const add=(child:Expr|Statement|undefined)=>{if(child)nodes.push({node:child,depth:depth+1})};
  switch(node.kind){
   case 'call':{const own=functions.get(node.name),arity=signatureFor(node.name)??(own===undefined?undefined:[own]);if(!arity){const correction=node.name==='leerSensorIRIzquierdo'?'leerSensorObstaculoIzquierdo':node.name==='leerSensorIRDerecho'?'leerSensorObstaculoDerecho':null;throw new LanguageError('UnknownFunctionError',`"${node.name}" no existe en la librería IROH ni en tu programa.${correction?` ¿Quisiste usar "${correction}"?`:''}`,node.loc);}if(!arity.includes(node.args.length))throw new LanguageError('ArgumentError',`${node.name}() espera ${arity.join(' o ')} argumento(s).`,node.loc);node.args.forEach(add);break;}
   case 'block':node.statements.forEach(add);break;
   case 'declaration-group':node.declarations.forEach(add);break;
   case 'declaration':case 'return':add(node.value);break;
   case 'expression':add(node.expression);break;
   case 'assign':add(node.value);break;
   case 'binary':add(node.left);add(node.right);break;
   case 'unary':if((node.op==='++'||node.op==='--')&&node.argument.kind!=='variable')throw new LanguageError('SyntaxError','++ y -- necesitan una variable.',node.loc);add(node.argument);break;
   case 'if':add(node.condition);add(node.then);add(node.otherwise);break;
   case 'while':add(node.condition);add(node.body);break;
   case 'for':add(node.init);add(node.condition);add(node.update);add(node.body);break;
  }
 }
}
