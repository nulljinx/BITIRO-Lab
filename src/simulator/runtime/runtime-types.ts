export interface SourceLocation { startLine:number; startColumn:number; endLine:number; endColumn:number }
export const origin:SourceLocation={startLine:1,startColumn:1,endLine:1,endColumn:1};
export type ErrorKind='SyntaxError'|'UnknownFunctionError'|'ArgumentError'|'ExecutionLimitError'|'RuntimeError';
export interface Diagnostic {kind:ErrorKind;line:number;column:number;endLine:number;endColumn:number;message:string}
export type ValueType='int'|'long'|'float'|'bool'|'string'|'void';
export type RuntimeValue={type:ValueType;value:number|boolean|string|null};
export const numberValue=(value:number,type:ValueType='int'):RuntimeValue=>({type,value});
export const voidValue:RuntimeValue={type:'void',value:null};
export type RuntimeWait={type:'time'|'motor-brake';untilSimMs:number}|{type:'button'};
export type RuntimeYield={kind:'instruction';loc:SourceLocation}|{kind:'wait';wait:RuntimeWait}|{kind:'loop-boundary'}|{kind:'finish'};
export type Execution<T=RuntimeValue>=Generator<RuntimeYield,T,void>;
