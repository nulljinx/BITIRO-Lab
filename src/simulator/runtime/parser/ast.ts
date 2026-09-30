import type {SourceLocation,ValueType,RuntimeValue} from '../runtime-types';
interface Node {loc:SourceLocation}
export type Expr=Node & (
 | {kind:'literal';value:RuntimeValue}
 | {kind:'variable';name:string}
 | {kind:'binary';op:string;left:Expr;right:Expr}
 | {kind:'unary';op:string;argument:Expr;postfix?:boolean}
 | {kind:'assign';op:string;name:string;value:Expr}
 | {kind:'call';name:string;args:Expr[]});
export interface Declaration extends Node {kind:'declaration';type:ValueType;name:string;constant:boolean;value?:Expr}
export interface DeclarationGroup extends Node {kind:'declaration-group';declarations:Declaration[]}
export type Statement=Node & (
 | Declaration | DeclarationGroup | {kind:'block';statements:Statement[]}
 | {kind:'expression';expression:Expr}
 | {kind:'if';condition:Expr;then:Statement;otherwise?:Statement}
 | {kind:'while';condition:Expr;body:Statement}
 | {kind:'for';init?:Statement;condition?:Expr;update?:Expr;body:Statement}
 | {kind:'return';value?:Expr} | {kind:'break'} | {kind:'continue'} | {kind:'empty'});
export interface FunctionNode extends Node {kind:'function';name:string;returnType:ValueType;params:Array<{type:ValueType;name:string;loc:SourceLocation}>;body:Statement}
export interface Program {globals:Declaration[];functions:FunctionNode[]}
