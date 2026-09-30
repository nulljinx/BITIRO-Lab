import type {Diagnostic,ErrorKind,SourceLocation} from '../runtime-types';
import {origin} from '../runtime-types';
export class LanguageError extends Error {
  constructor(public kind:ErrorKind,message:string,public loc:SourceLocation=origin){super(message);this.name=kind;}
  diagnostic():Diagnostic{return {kind:this.kind,line:this.loc.startLine,column:this.loc.startColumn,endLine:this.loc.endLine,endColumn:Math.max(this.loc.startColumn+1,this.loc.endColumn),message:this.message};}
}
export function diagnosticFor(error:unknown):Diagnostic {
 if(error instanceof LanguageError)return error.diagnostic();
 return new LanguageError('RuntimeError','No se pudo ejecutar el programa. Revisa el código y vuelve a intentarlo.').diagnostic();
}
