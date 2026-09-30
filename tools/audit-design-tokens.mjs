import {readdir, readFile} from 'node:fs/promises';

const stylesDir=new URL('../src/styles/',import.meta.url);
const baselineUrl=new URL('./design-token-baseline.json',import.meta.url);
const files=(await readdir(stylesDir)).filter(file=>file.endsWith('.css')&&file!=='tokens.css').sort();

// Raw palette syntax should be centralized in tokens.css. BITIRO still has legacy CSS
// predating that rule, so CI freezes the existing debt and rejects only NEW or
// INCREASED raw-color usage. The baseline must shrink as legacy styles are migrated.
const rawHex=/#[0-9a-fA-F]{3,8}\b/g;
const rawFunctional=/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\s*\([^;{}]*\)/gi;
const namedSurface=/(?:background|background-color|color|border-color|outline-color|text-decoration-color|fill|stroke)\s*:\s*(?:white|black|red|blue|green|yellow|orange|purple|gray|grey)\b/gi;
const tokenDefinitions=/(?:^|[;{])\s*--(?:bitiro|lab|surface|instrument|border|text|action|status|readout|brand|alpha|overlay|grid|shadow)-[\w-]+\s*:/gm;

const normalize=value=>value.toLowerCase().replace(/\s+/g,' ').trim();
const currentCounts=new Map();
const tokenDefinitionViolations=[];

function add(file,kind,value){
  const normalized=normalize(value);
  const key=`${file}|${kind}|${normalized}`;
  const previous=currentCounts.get(key)??{file,kind,value:normalized,count:0};
  previous.count+=1;
  currentCounts.set(key,previous);
}

for(const file of files){
  const text=await readFile(new URL(file,stylesDir),'utf8');
  for(const match of text.matchAll(rawHex)) add(file,'hex',match[0]);
  for(const match of text.matchAll(rawFunctional)) add(file,'functional',match[0]);
  for(const match of text.matchAll(namedSurface)) add(file,'named',match[0]);
  // Design-token definitions themselves are never grandfathered. They belong in tokens.css.
  for(const match of text.matchAll(tokenDefinitions)) tokenDefinitionViolations.push(`${file}: design token defined outside tokens.css: ${match[0].trim()}`);
}

const baseline=JSON.parse(await readFile(baselineUrl,'utf8'));
if(baseline.version!==1||!baseline.allow||typeof baseline.allow!=='object'){
  console.error('Design-token audit failed: invalid tools/design-token-baseline.json');
  process.exit(1);
}

const regressions=[];
for(const [key,entry] of currentCounts){
  const allowed=Number(baseline.allow[key]??0);
  if(entry.count>allowed){
    regressions.push(`${entry.file}: ${entry.kind} ${entry.value} appears ${entry.count}× (baseline allows ${allowed}×)`);
  }
}
regressions.push(...tokenDefinitionViolations);

const currentTotal=[...currentCounts.values()].reduce((sum,entry)=>sum+entry.count,0);
const baselineTotal=Number(baseline.total??Object.values(baseline.allow).reduce((sum,count)=>sum+Number(count),0));
const debtReduced=Math.max(0,baselineTotal-currentTotal);

if(regressions.length){
  console.error('Design-token audit failed. New design-token debt detected:\n'+regressions.map(v=>` - ${v}`).join('\n'));
  console.error(`Legacy baseline: ${baselineTotal} occurrence(s); current legacy raw-color usage: ${currentTotal}.`);
  console.error('Use tokens from src/styles/tokens.css. Do not raise the baseline to make CI pass.');
  process.exit(1);
}

console.log(`Design-token audit passed (${files.length} CSS files).`);
console.log(`Legacy raw-color debt is frozen at <= ${baselineTotal} occurrence(s); current: ${currentTotal}${debtReduced?` (${debtReduced} removed)`:''}. New/increased raw colors are rejected.`);
