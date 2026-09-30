import type {SourceLocation} from '../runtime-types';
export interface Token {kind:'identifier'|'number'|'string'|'symbol'|'keyword'|'eof';text:string;loc:SourceLocation}
export const keywords=new Set(['void','int','long','float','bool','const','char','true','false','if','else','while','for','break','return','continue']);
