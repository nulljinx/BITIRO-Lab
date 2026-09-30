import {LIMITS} from './runtime-limits';
export function isSupportedSource(value: unknown): value is string {
  return typeof value === 'string' && value.length <= LIMITS.sourceBytes
    && new TextEncoder().encode(value).byteLength <= LIMITS.sourceBytes;
}
export const SOURCE_LIMIT_MESSAGE = 'El programa supera 32 KiB. Reduce su tamaño antes de guardar o ejecutar; puedes descargar el texto completo.';
