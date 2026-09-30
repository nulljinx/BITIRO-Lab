import type {Token} from '../tokenizer/tokens';
import {tokenize} from '../tokenizer/Tokenizer';
import type {Program,FunctionNode,Statement,Expr,Declaration} from './ast';
import type {ValueType,SourceLocation} from '../runtime-types';
import {LanguageError} from '../interpreter/RuntimeError';
import {LIMITS} from '../runtime-limits';
const types=new Set(['int','long','float','bool','void','char']);
const precedence:Record<string,number>={'=':1,'+=':1,'-=':1,'||':2,'&&':3,'==':4,'!=':4,'<':5,'>':5,'<=':5,'>=':5,'+':6,'-':6,'*':7,'/':7,'%':7};
export class Parser {
 private tokens:Token[];private i=0;private depth=0;private loopDepth=0;
 constructor(source:string){this.tokens=tokenize(source);}
 private get token(){return this.tokens[Math.min(this.i,this.tokens.length-1)];}
 private take(){return this.tokens[this.i++];}
 private match(text:string){if(this.token.text===text){this.take();return true;}return false;}
 private expect(text:string,message=`Falta "${text}".`){if(!this.match(text))throw new LanguageError('SyntaxError',message,this.token.loc);}
 private identifier(){if(this.token.kind!=='identifier')throw new LanguageError('SyntaxError','Se esperaba un nombre de variable o función.',this.token.loc);return this.take();}
 private span(start:SourceLocation):SourceLocation {const end=this.tokens[Math.max(0,this.i-1)].loc;return {...start,endLine:end.endLine,endColumn:end.endColumn};}
 private bounded<T>(fn:()=>T):T{if(++this.depth>LIMITS.astDepth)throw new LanguageError('ExecutionLimitError','Hay demasiados niveles de paréntesis o bloques.',this.token.loc);try{return fn();}finally{this.depth--;}}
 private readType():ValueType{const t=this.take();if(!types.has(t.text))throw new LanguageError('SyntaxError','Usa int, long, float, bool o void.',t.loc);return t.text==='char'?'string':t.text as ValueType;}
 parse():Program{
  const program:Program={globals:[],functions:[]};
  while(this.token.kind!=='eof'){
   const loc=this.token.loc,constant=this.match('const'),type=this.readType(),name=this.identifier().text;
   if(this.match('(')){
    if(constant)throw new LanguageError('SyntaxError','No se admite const en una función.',loc);
    const params:FunctionNode['params']=[];
    if(!this.match(')')){if(this.token.text==='void'){this.take();this.expect(')');}else{do{const pLoc=this.token.loc,pType=this.readType(),pName=this.identifier().text;if(pType==='void'||pType==='string')throw new LanguageError('SyntaxError','Este tipo de parámetro no está admitido.',pLoc);params.push({type:pType,name:pName,loc:pLoc});}while(this.match(','));this.expect(')');}}
    if(this.token.text!=='{')throw new LanguageError('SyntaxError','Falta el bloque de la función entre llaves.',this.token.loc);
    const body=this.statement();program.functions.push({kind:'function',name,returnType:type,params,body,loc:this.span(loc)});
   }else program.globals.push(...this.declarationList(loc,type,name,constant));
  }
  for(const name of ['setup','loop']){const fn=program.functions.find(f=>f.name===name);if(!fn||fn.params.length||fn.returnType!=='void')throw new LanguageError('SyntaxError',`Debes definir void ${name}() sin parámetros.`,fn?.loc);}
  return program;
 }
 private declarationList(loc:SourceLocation,type:ValueType,firstName:string,constant:boolean):Declaration[]{
  if(type==='void')throw new LanguageError('SyntaxError','Una variable no puede ser void.',loc);
  const declarations:Declaration[]=[];
  let name=firstName,declLoc=loc;
  while(true){
   if(type==='string'){if(!constant)throw new LanguageError('SyntaxError','Solo se admite texto como const char nombre[] = "texto".',declLoc);this.expect('[');this.expect(']');}
   const value=this.match('=')?this.expression():undefined;
   if(constant&&!value)throw new LanguageError('SyntaxError',`La constante "${name}" necesita un valor inicial.`,declLoc);
   declarations.push({kind:'declaration',type,name,constant,value,loc:this.span(declLoc)});
   if(!this.match(','))break;
   const next=this.identifier();name=next.text;declLoc=next.loc;
  }
  this.expect(';','Falta ";" al final de la declaración.');
  return declarations;
 }
 private statement():Statement{return this.bounded(()=>{
  const loc=this.token.loc;
  if(this.match('{')){const statements:Statement[]=[];while(this.token.kind!=='eof'&&this.token.text!=='}')statements.push(this.statement());this.expect('}','Falta cerrar el bloque con "}".');return {kind:'block',statements,loc:this.span(loc)};}
  if(this.match(';'))return {kind:'empty',loc};
  if(this.match('if')){this.expect('(');const condition=this.expression();this.expect(')','Falta ")" después de la condición.');const then=this.statement(),otherwise=this.match('else')?this.statement():undefined;return {kind:'if',condition,then,otherwise,loc:this.span(loc)};}
  if(this.match('while')){this.expect('(');const condition=this.expression();this.expect(')');this.loopDepth++;const body=this.statement();this.loopDepth--;return {kind:'while',condition,body,loc:this.span(loc)};}
  if(this.match('for')){this.expect('(');let init:Statement|undefined;if(!this.match(';'))init=this.statement();const condition=this.token.text===';'?undefined:this.expression();this.expect(';');const update=this.token.text===')'?undefined:this.expression();this.expect(')');this.loopDepth++;const body=this.statement();this.loopDepth--;return {kind:'for',init,condition,update,body,loc:this.span(loc)};}
  if(this.match('break')){if(!this.loopDepth)throw new LanguageError('SyntaxError','break solo puede usarse dentro de un ciclo.',loc);this.expect(';');return {kind:'break',loc:this.span(loc)};}
  if(this.match('continue')){if(!this.loopDepth)throw new LanguageError('SyntaxError','continue solo puede usarse dentro de un ciclo.',loc);this.expect(';');return {kind:'continue',loc:this.span(loc)};}
  if(this.match('return')){const value=this.token.text===';'?undefined:this.expression();this.expect(';');return {kind:'return',value,loc:this.span(loc)};}
  if(types.has(this.token.text)||this.token.text==='const'){const constant=this.match('const'),type=this.readType(),name=this.identifier().text,declarations=this.declarationList(loc,type,name,constant);return declarations.length===1?declarations[0]:{kind:'declaration-group',declarations,loc:this.span(loc)};}
  const expression=this.expression();this.expect(';','Falta ";" después de la instrucción.');return {kind:'expression',expression,loc:this.span(loc)};
 });}
 private expression(min=1):Expr{return this.bounded(()=>{
  let left=this.primary();
  while((precedence[this.token.text]??0)>=min){const op=this.take().text,rank=precedence[op],right=this.expression(rank+(rank===1?0:1));if(rank===1){if(left.kind!=='variable')throw new LanguageError('SyntaxError','Solo puedes asignar a una variable.',left.loc);left={kind:'assign',op,name:left.name,value:right,loc:this.span(left.loc)};}else left={kind:'binary',op,left,right,loc:this.span(left.loc)};}
  return left;
 });}
 private primary():Expr{return this.bounded(()=>{
  const t=this.take();let node:Expr;
  if(['!','-','+','++','--'].includes(t.text))return {kind:'unary',op:t.text,argument:this.primary(),loc:this.span(t.loc)};
  if(t.kind==='number')node={kind:'literal',value:{type:t.text.includes('.')?'float':'int',value:Number(t.text)},loc:t.loc};
  else if(t.kind==='string')node={kind:'literal',value:{type:'string',value:t.text},loc:t.loc};
  else if(t.text==='true'||t.text==='false')node={kind:'literal',value:{type:'bool',value:t.text==='true'},loc:t.loc};
  else if(t.text==='('){node=this.expression();this.expect(')');node={...node,loc:this.span(t.loc)};}
  else if(t.kind==='identifier'){
   if(this.match('(')){const args:Expr[]=[];if(!this.match(')')){do{args.push(this.expression());}while(this.match(','));this.expect(')');}node={kind:'call',name:t.text,args,loc:this.span(t.loc)};}
   else node={kind:'variable',name:t.text,loc:t.loc};
  }else throw new LanguageError('SyntaxError','Se esperaba un valor, una variable o una llamada a función.',t.loc);
  if(this.token.text==='++'||this.token.text==='--'){const op=this.take().text;if(node.kind!=='variable')throw new LanguageError('SyntaxError','++ y -- necesitan una variable.',node.loc);node={kind:'unary',op,argument:node,postfix:true,loc:this.span(t.loc)};}
  return node;
 });}
}
