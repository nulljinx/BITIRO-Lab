import {describe,expect,it} from 'vitest';
import {safeNext} from '../features/auth/auth-navigation';

describe('safeNext',()=>{
  it('allows BITIRO account and cohort-scoped institutional routes',()=>{
    for(const path of [
      '/espacios',
      '/espacios/mustakis/grupos/talca-a',
      '/espacios/mustakis/grupos/talca-a/mentor',
      '/espacios/mustakis/grupos/talca-a/intermedio/s01',
      '/espacios/mustakis/grupos/talca-a/intermedio/s02?debug=1',
      '/cuenta',
    ]) expect(safeNext(path)).toBe(path);
  });
  it('keeps pre-6.3.2 institutional links only as compatibility redirects',()=>{
    for(const path of ['/espacios/mustakis','/espacios/mustakis/mentor','/espacios/mustakis/intermedio/s01']){
      expect(safeNext(path)).toBe(path);
    }
  });
  it('rejects external, protocol-relative and unknown paths',()=>{
    for(const path of ['https://example.com','//example.com','/espacios\\evil','/no-existe']){
      expect(safeNext(path)).toBe('/espacios');
    }
  });
});
