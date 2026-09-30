import type {RuntimeValue,SourceLocation} from '../runtime-types';
import {numeric,cast} from './Environment';
import {LanguageError} from './RuntimeError';
export function binary(op:string,a:RuntimeValue,b:RuntimeValue,loc:SourceLocation):RuntimeValue {
 const x=numeric(a,loc),y=numeric(b,loc);let value:number|boolean;
 if((op==='/'||op==='%')&&y===0)throw new LanguageError('RuntimeError','No se puede dividir por cero.',loc);
 switch(op){case '+':value=x+y;break;case '-':value=x-y;break;case '*':value=x*y;break;case '/':value=x/y;break;case '%':if(a.type==='float'||b.type==='float')throw new LanguageError('ArgumentError','El resto % solo acepta enteros.',loc);value=x%y;break;case '==':value=x===y;break;case '!=':value=x!==y;break;case '<':value=x<y;break;case '>':value=x>y;break;case '<=':value=x<=y;break;case '>=':value=x>=y;break;default:throw new LanguageError('RuntimeError','Operador no admitido.',loc);}
 if(typeof value==='boolean')return {type:'bool',value};
 const type=a.type==='float'||b.type==='float'?'float':a.type==='long'||b.type==='long'?'long':'int';return cast({type,value},type,loc);
}
