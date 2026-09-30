import {ROBOT} from '../config';
import type {SimulationEngine} from '../SimulationEngine';
import type {Execution} from './runtime-types';
import {voidValue} from './runtime-types';
export const irohSpeedToCmS=(value:number)=>{const pwm=Math.min(100,Math.max(0,value));return pwm===0?0:(50+pwm)/150*ROBOT.maxWheelCmS;};
export class Movement {
 private mode='stopped';
 constructor(private engine:SimulationEngine){}
 *stop():Execution {this.engine.robot.leftMotor=0;this.engine.robot.rightMotor=0;this.mode='stopped';yield {kind:'wait',wait:{type:'motor-brake',untilSimMs:this.engine.robot.simTimeMs+70}};return voidValue;}
 *move(mode:string,left:number,right:number):Execution {if(this.mode!==mode)yield* this.stop();this.mode=mode;this.engine.robot.leftMotor=left;this.engine.robot.rightMotor=right;return voidValue;}
}
