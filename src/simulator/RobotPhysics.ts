import { ROBOT } from './config';
import type { RobotState } from './types';
export function integrate(robot: RobotState, dt: number): RobotState {
  const v=(robot.leftMotor+robot.rightMotor)/2;
  // Screen coordinates: positive heading rotates clockwise.
  const w=(robot.leftMotor-robot.rightMotor)/ROBOT.wheelBaseCm;
  const theta=robot.heading+w*dt;
  const dx=Math.abs(w)<1e-9 ? v*Math.cos(robot.heading)*dt : v/w*(Math.sin(theta)-Math.sin(robot.heading));
  const dy=Math.abs(w)<1e-9 ? v*Math.sin(robot.heading)*dt : v/w*(Math.cos(robot.heading)-Math.cos(theta));
  return {...robot,x:robot.x+dx,y:robot.y+dy,heading:Math.atan2(Math.sin(theta),Math.cos(theta)),simTimeMs:robot.simTimeMs+dt*1000};
}
