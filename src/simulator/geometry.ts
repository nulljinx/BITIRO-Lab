import type { Point, LinePath, Obstacle } from './types';
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function lineCoverage(p: Point, paths: LinePath[]): number {
  let coverage = 0;
  for (const path of paths) for (let i=1;i<path.points.length;i++) {
    const distance = distanceToSegment(p,path.points[i-1],path.points[i]);
    coverage = Math.max(coverage,Math.max(0, Math.min(1,(path.widthCm/2 + .25 - distance)/.5)));
  }
  return coverage;
}
export function intersectsCircle(p: Point, radius: number, box: Obstacle): boolean {
  const x = Math.max(box.x,Math.min(p.x,box.x+box.width));
  const y = Math.max(box.y,Math.min(p.y,box.y+box.height));
  return Math.hypot(p.x-x,p.y-y)<radius;
}
export function rayBox(origin: Point, direction: Point, box: Obstacle): number {
  let near = 0, far = Infinity;
  for (const axis of ['x','y'] as const) {
    const extent = axis === 'x' ? box.width : box.height;
    if (Math.abs(direction[axis]) < 1e-10) {
      if (origin[axis] < box[axis] || origin[axis] > box[axis]+extent) return Infinity;
    } else {
      const a=(box[axis]-origin[axis])/direction[axis], b=(box[axis]+extent-origin[axis])/direction[axis];
      near=Math.max(near,Math.min(a,b)); far=Math.min(far,Math.max(a,b));
      if (near>far) return Infinity;
    }
  }
  return near;
}
