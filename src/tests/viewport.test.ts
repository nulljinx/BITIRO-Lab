import {it,expect} from 'vitest';
import {viewportTransform} from '../simulator/renderer/viewport';
import track from '../content/tracks/s01.json';
it.each([.75,1,1.25,2])('zoom %s keeps canvas and pointer coordinates consistent',zoom=>{const {scale,offsetX,offsetY}=viewportTransform(420,620,track,zoom);const world={x:72,y:115},screen={x:offsetX+world.x*scale,y:offsetY+world.y*scale};expect((screen.x-offsetX)/scale).toBeCloseTo(world.x);expect((screen.y-offsetY)/scale).toBeCloseTo(world.y);expect(offsetX+50*scale).toBe(210);expect(offsetY+70*scale).toBe(310);});
it('fitted physical track stays within the viewport',()=>{const t=viewportTransform(260,390,track);expect(100*t.scale).toBeLessThanOrEqual(224+1e-9);expect(140*t.scale).toBeLessThanOrEqual(354+1e-9);});
it('caps calibration scale so a tall inspector cannot enlarge the plotter',()=>{const t=viewportTransform(1500,2000,track,.9,4.6);expect(t.scale).toBeLessThanOrEqual(4.6);expect(track.physicalWidthCm*t.scale).toBeLessThanOrEqual(1500);expect(track.physicalHeightCm*t.scale).toBeLessThanOrEqual(2000);});
