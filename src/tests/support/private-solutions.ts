import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

// Reference solutions never live in Git. The optional private suite reads them from BITIRO_SOLUTIONS_DIR
// (one `<session>.json` per session: {title,note,source}). Without the variable the private suite is skipped.
const dir=process.env.BITIRO_SOLUTIONS_DIR?.trim()||'';
const sessions=['s01','s02','s03','s04','s05'] as const;
export type PrivateSessionId=typeof sessions[number];

export const privateSolutionsAvailable=!!dir&&sessions.every(id=>existsSync(join(dir,`${id}.json`)));

if(!privateSolutionsAvailable)console.warn('[private suite] SKIPPED: BITIRO_SOLUTIONS_DIR is not set or does not hold s01-s05.json. Run it privately before each release.');

/** Returns the private source, or '' when the suite is skipped (callers are wrapped in describe.skipIf). */
export function privateSolution(id:PrivateSessionId):string{
  if(!privateSolutionsAvailable)return '';
  const parsed=JSON.parse(readFileSync(join(dir,`${id}.json`),'utf8')) as {source?:unknown};
  if(typeof parsed.source!=='string')throw new Error(`Private solution ${id} has no source`);
  return parsed.source;
}
