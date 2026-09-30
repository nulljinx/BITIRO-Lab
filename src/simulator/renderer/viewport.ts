import type {TrackDefinition} from '../types';
export function viewportTransform(width:number,height:number,track:TrackDefinition,zoom=1,maxScale=Infinity){
 const fit=Math.max(.01,Math.min((width-36)/track.physicalWidthCm,(height-36)/track.physicalHeightCm));
 const scale=Math.min(fit*zoom,maxScale);
 return {scale,offsetX:(width-track.physicalWidthCm*scale)/2,offsetY:(height-track.physicalHeightCm*scale)/2};
}
