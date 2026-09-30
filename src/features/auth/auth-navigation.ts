const allowedNext = [
  /^\/$/,
  /^\/espacios$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+\/mentor$/,
  /^\/espacios\/[a-z0-9-]+\/grupos\/[a-z0-9-]+\/intermedio\/s0[1-8](?:\?debug=1)?$/,
  // Compatibility redirects from pre-6.3.2 links. They resolve to an explicit cohort only when unambiguous.
  /^\/espacios\/[a-z0-9-]+$/,
  /^\/espacios\/[a-z0-9-]+\/mentor$/,
  /^\/espacios\/[a-z0-9-]+\/intermedio\/s0[1-8](?:\?debug=1)?$/,
  /^\/intermedio(?:\/s0[1-8])?(?:\?debug=1)?$/,
  /^\/(?:recursos|comunidad|privacidad|cuenta|equipo)$/,
];

export function safeNext(value:string|null,fallback='/espacios'){
  if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return fallback;
  return allowedNext.some(pattern=>pattern.test(value))?value:fallback;
}
