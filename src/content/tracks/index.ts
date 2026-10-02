import type {TrackDefinition} from '../../simulator/types';
import s01 from './s01.json';
import s02 from './s02.json';
import s03 from './s03.json';
import s04 from './s04.json';
import s05 from './s05.json';

const TRACKS:Readonly<Record<string,TrackDefinition>>={s01:s01 as TrackDefinition,s02:s02 as TrackDefinition,s03:s03 as TrackDefinition,s04:s04 as TrackDefinition,s05:s05 as TrackDefinition};
export const simulatedSessionIds=Object.freeze(Object.keys(TRACKS));
export function hasSimulation(sessionId:string){return Object.prototype.hasOwnProperty.call(TRACKS,sessionId);}
export function trackForSession(sessionId:string):TrackDefinition{
 const track=TRACKS[sessionId];
 if(!track)throw new Error(`No hay pista interactiva para ${sessionId}.`);
 return track;
}
