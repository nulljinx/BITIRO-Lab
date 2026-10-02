// Monaco keeps "Tab moves focus" in a module-level singleton and recomputes the `tabFocusMode` editor option from it,
// so the constructor option is ignored and the stock toggle action (Ctrl+M) is not part of the editor.api build we ship.
// This is the same singleton the editor reads; the module has no type declarations.
// @ts-expect-error internal ESM module without .d.ts
import {TabFocus} from 'monaco-editor/esm/vs/editor/browser/config/tabFocus.js';

export interface TabFocusControl{
  getTabFocusMode():boolean;
  setTabFocusMode(value:boolean):void;
  onDidChangeTabFocus(listener:(value:boolean)=>void):{dispose():void};
}
export const tabFocus=TabFocus as TabFocusControl;
export const isMacPlatform=()=>typeof navigator!=='undefined'&&/Mac|iPhone|iPad/.test(navigator.platform);
export const tabNavigationShortcut=(mac=isMacPlatform())=>mac?'Control+Mayúscula+M':'Control+M';
