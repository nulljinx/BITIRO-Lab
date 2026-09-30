import {keywords} from './tokens';
import type {Token} from './tokens';
import {LanguageError} from '../interpreter/RuntimeError';
import {LIMITS} from '../runtime-limits';
import type {SourceLocation} from '../runtime-types';
export function tokenize(source:string):Token[] {
 if(new TextEncoder().encode(source).length>LIMITS.sourceBytes)throw new LanguageError('ExecutionLimitError','Tu programa supera el límite de 32 KB. Divídelo en tareas más pequeñas.');
 let i=0,line=1,column=1;const tokens:Token[]=[];
 const at=()=>source[i]??'';
 const take=()=>{const c=source[i++];if(c==='\n'){line++;column=1}else column++;return c;};
 const location=():SourceLocation=>({startLine:line,startColumn:column,endLine:line,endColumn:column});
 const push=(kind:Token['kind'],text:string,loc:SourceLocation)=>{tokens.push({kind,text,loc:{...loc,endLine:line,endColumn:column}});if(tokens.length>LIMITS.tokens)throw new LanguageError('ExecutionLimitError','Tu programa contiene demasiadas instrucciones.',loc);};
 const digit=(c:string)=>c>='0'&&c<='9';
 const letter=(c:string)=>!!c&&((c>='a'&&c<='z')||(c>='A'&&c<='Z')||c==='_');
 while(i<source.length){
  if(' \r\n\t'.includes(at())){take();continue;}
  const loc=location();
  if(at()==='/'&&source[i+1]==='/'){while(i<source.length&&at()!=='\n')take();continue;}
  if(at()==='/'&&source[i+1]==='*'){take();take();while(i<source.length&&!(at()==='*'&&source[i+1]==='/'))take();if(i>=source.length)throw new LanguageError('SyntaxError','Falta cerrar el comentario con */.',loc);take();take();continue;}
  if(at()==='#'){
   take();while(at()===' '||at()==='\t')take();let directive='';while(letter(at()))directive+=take();
   while(at()===' '||at()==='\t')take();let header='';if(at()==='<'){take();while(i<source.length&&at()!=='>'&&at()!=='\n')header+=take();if(at()==='>')take();else throw new LanguageError('SyntaxError','Falta cerrar > en include.',loc);}
   if(directive!=='include'||header!=='KnightRoboticsLibs_Iroh.h')throw new LanguageError('SyntaxError','Esta versión del simulador solo permite la librería del IROH.',loc);
   continue;
  }
  if(letter(at())){let s='';while(letter(at())||digit(at()))s+=take();push(keywords.has(s)?'keyword':'identifier',s,loc);continue;}
  if(digit(at())){let s='';while(digit(at()))s+=take();if(at()==='.'&&digit(source[i+1]??'')){s+=take();while(digit(at()))s+=take();}if(!Number.isFinite(Number(s)))throw new LanguageError('ArgumentError','El número es demasiado grande.',loc);push('number',s,loc);continue;}
  if(at()==='"'){
   take();let s='';while(i<source.length&&at()!=='"'){
    if(at()==='\n')throw new LanguageError('SyntaxError','Falta cerrar las comillas del texto.',loc);
    let c=take();if(c.charCodeAt(0)===92){const escaped=take();const map=new Map([['n',String.fromCharCode(10)],['t',String.fromCharCode(9)],['r',String.fromCharCode(13)],['"','"'],[String.fromCharCode(92),String.fromCharCode(92)]]);const value=map.get(escaped);if(value===undefined)throw new LanguageError('SyntaxError','Secuencia de escape no admitida.',loc);c=value;}s+=c;
    if(s.length>LIMITS.stringLength)throw new LanguageError('ExecutionLimitError','El texto no puede superar 256 caracteres.',loc);
   }
   if(at()!=='"')throw new LanguageError('SyntaxError','Falta cerrar las comillas del texto.',loc);take();push('string',s,loc);continue;
  }
  const pair=source.slice(i,i+2);if(['==','!=','<=','>=','&&','||','++','--','+=','-='].includes(pair)){take();take();push('symbol',pair,loc);continue;}
  if('+-*/%<>=!(){}[],;'.includes(at())){push('symbol',take(),loc);continue;}
  throw new LanguageError('SyntaxError',`El símbolo "${at()}" no está admitido en este simulador.`,loc);
 }
 push('eof','',location());return tokens;
}
