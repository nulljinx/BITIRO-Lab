import {starterCode, type SessionDefinition} from '../../content/sessions';
import {isSupportedSource} from '../../simulator/runtime/source-size';
let currentScope = 'guest';
export function setStorageScope(scope: string | null) { currentScope = scope || 'guest'; }
export function getStorageScope() { return currentScope; }
export const scopedStorageKey = (key: string, scope = currentScope) => `bitiro:v7:${encodeURIComponent(scope)}:${key}`;
export function workspaceStorageScope(userId:string,cohortId:string,activityVersion=1){
  return `user:${userId}|cohort:${cohortId}|activity:${activityVersion}`;
}
export const codeKey = (id: string, scope = currentScope) => scopedStorageKey(`code:${id}`, scope);
export const progressKey = (scope = currentScope) => scopedStorageKey('explored', scope);
function notify(name: string, detail: unknown) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, {detail}));
}
function savedDocument(raw: string | null): {code: string; lastOpenedAt: number} | null {
  if (!raw || raw.length > 200000) return null;
  const value = JSON.parse(raw);
  return value && isSupportedSource(value.code)
    ? {code: value.code, lastOpenedAt: Number.isFinite(value.lastOpenedAt) ? value.lastOpenedAt : 0} : null;
}
/** Read the existing local document without creating or changing its timestamp. */
export function localCodeDocument(id:string,scope=currentScope):{code:string;lastOpenedAt:number}|null {
 try{return savedDocument(localStorage.getItem(codeKey(id,scope)));}catch{return null;}
}
export function loadCode(session: SessionDefinition, scope = currentScope): string {
  try {
    let raw = localStorage.getItem(codeKey(session.id, scope));
    let saved = savedDocument(raw);
    // One-time compatibility read for pre-v7 non-institutional scopes. Institutional scopes never import shared work.
    if(!saved && !scope.includes('|cohort:')){
      const legacyV6=localStorage.getItem(`bitiro:v6:${encodeURIComponent(scope)}:code:${session.id}`);
      saved=savedDocument(legacyV6);
      if(saved) localStorage.setItem(codeKey(session.id,scope),JSON.stringify(saved));
    }
    if (saved) return saved.code;
    // Legacy work belongs only to the local guest, never to a signed-in account.
    if (raw === null && scope === 'guest') {
      const legacy = savedDocument(localStorage.getItem(`iroh-code-intermedio-${session.id}`));
      if (legacy) { localStorage.setItem(codeKey(session.id, scope), JSON.stringify(legacy)); return legacy.code; }
    }
  } catch { /* A corrupt/blocked store must not prevent opening the editor. */ }
  return starterCode(session);
}
export function saveCode(id: string, code: string, scope = currentScope): boolean {
  if (!isSupportedSource(code)) return false;
  try {
    const lastOpenedAt = Date.now();
    localStorage.setItem(codeKey(id, scope), JSON.stringify({code, lastOpenedAt}));
    notify('bitiro:document-saved', {scope, id, code, lastOpenedAt});
    return true;
  } catch { return false; }
}
export function explored(scope = currentScope): string[] {
  try {
    let raw = localStorage.getItem(progressKey(scope));
    if(raw===null && !scope.includes('|cohort:')){
      const legacyV6=localStorage.getItem(`bitiro:v6:${encodeURIComponent(scope)}:explored`);
      if(legacyV6&&legacyV6.length<1000){raw=legacyV6;localStorage.setItem(progressKey(scope),legacyV6);}
    }
    if (raw === null && scope === 'guest') {
      raw = localStorage.getItem('iroh-explored-intermedio');
      if (raw && raw.length < 1000) localStorage.setItem(progressKey(scope), raw);
    }
    if (!raw || raw.length > 1000) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^s0[1-8]$/.test(id)))] : [];
  } catch { return []; }
}
export function markExplored(id: string, scope = currentScope) {
  if (!/^s0[1-8]$/.test(id)) return;
  try {
    localStorage.setItem(scopedStorageKey('last-session',scope),id);
    localStorage.setItem(progressKey(scope), JSON.stringify([...new Set([...explored(scope), id])]));
    notify('bitiro:progress-changed', {scope, id});
  } catch { /* Local progress is optional. */ }
}

export function lastVisited(scope = currentScope): string | null {
  try {
    let id=localStorage.getItem(scopedStorageKey('last-session',scope));
    if(!id&&!scope.includes('|cohort:')){
      id=localStorage.getItem(`bitiro:v6:${encodeURIComponent(scope)}:last-session`);
      if(id&&/^s0[1-8]$/.test(id))localStorage.setItem(scopedStorageKey('last-session',scope),id);
    }
    return id && /^s0[1-8]$/.test(id) ? id : null;
  } catch { return null; }
}
