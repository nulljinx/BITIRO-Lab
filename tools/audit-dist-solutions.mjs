// SEC-1 build gate: the shipped bundle must not contain mentor reference solutions.
//
// Usage: node tools/audit-dist-solutions.mjs [distDir]      audit a build (default: dist)
//        node tools/audit-dist-solutions.mjs --self-test    negative control on a synthetic dist
//
// Layers (none stores solution code):
//  1. Generic markers: .map files, sourceMappingURL, the retired module name and identifiers, the header comment
//     the old solutions began with. The UI label "Solución de referencia" is NOT a marker: only content is.
//  2. SHA-256 of normalised distinctive lines (and note texts) of the five solutions that were already public.
//     Every text file is split on real newlines AND on literal "\n" escapes (minified template strings), and
//     every string literal is hashed too. Hashes reveal nothing that is not already public.
//  3. Optional private markers from BITIRO_SOLUTION_MARKERS_FILE (outside Git): one entry per line, either a
//     literal substring or "sha256:<hex>" of a normalised line. Used for the NEW solutions; never printed.
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

// SHA-256 of normalised (trim + collapsed whitespace) distinctive lines of the retired, already-public solutions.
const LINE_HASHES=new Set([
  '4e8b3729eb08be32d46b23b7b5ce22ffc98b6a271b94de044a37363468e92f83',
  '19056dad4c1e2aa371098ab373f04fa35e0b9fb2503bb976ed9cb357f5f17321',
  'c7645e8d932d1b3ca59949de131201c9a01283b7b55a1514dd0a6a54e3302b60',
  '11f523bb8fdc400714b28b7afd1cd597487e6e92ea32311853cb164a87d01844',
  'f6078d2ccaa8101a8793cbb182e03325a354e98e512628601be5bdadfed19d8f',
  '9c3a8bdcedf2d7df510aa39a94f735f1c61969c53a260f1c5e3d2886f1a66165',
  '17f642bdfc709ae16dddc502d95e6cae7773e09716d81ba9681ecf244d2a2f59',
  'bee26a0c84f45c0cb284fbfc825777af2d2768261bb14ab8b056c348c4ecd948',
  '708884f89c31e1824c35f852cc5353424dd701dbb3937329f032036d721afcc3',
  '5b7a9436832e136ee536608775887692fdb1e007e96d28c768506a7541cbef78',
  'c97617713fe99e6d774f475118a51b4647ea43f90f9f490ea896abf40170ea5c',
  '218562dcf2a097d5be2e303abbcbc9c83d9ac46352a4b0ef6bb3775d26d8afbc',
  '4e8b3729eb08be32d46b23b7b5ce22ffc98b6a271b94de044a37363468e92f83',
  '553d0b20c65423237abd4522ca017f26d58c3d8003a3246384ad08bfffde6e7c',
  'ad12aadf08d8f9c45bd859eb0f388aa7a7a0ca3caad156d82f2158ff14114de7',
  '3897e0b0e5f3a77f4d6ea864b7ffefc4ab4a04330a1cea0d7930861438fc690a',
  'f1dfa979a6abc4202a7c4dd0345b94bfff96055825d670dcd283cf550169fed7',
  '43c448bacb85277853f06cd3a29e8fb0141270b22f65ed7b3506ccdc0246bba6',
  '6837a9a2f11ef5977b2dbe26aea0192044205c24028e0e7d7314abca61e71b32',
  '122d270f617d32a0708d04ecb3e0f165f7dbd8026ff9e3c49345d34f15e0d2ff',
  '19e0eb95b57c1cd371acd744a09f5ffdb03e078fe3cef303f60ee7de061c5b55',
  'dae1078d1b30708dfcd13569eb155a6c97119bbabcec7b998ca88f782fc0007a',
  '2816da10b4639912acf2c7b5502e505679539a1cf4f66c45e88cf695c0b94826',
  'e00a09d6c467240ffbd6e2b63d91b149ea27f270e71a175a60cf59890763ab67',
  '4e8b3729eb08be32d46b23b7b5ce22ffc98b6a271b94de044a37363468e92f83',
  'bf189d574a5af8d8b73b0838ac508d1a0b0f83c4463ead22069a5267e9e73ee9',
  'cd9b0841ed3911b4b7929c161261c64c888d5003f59201d5871f7e7cf2d62b8d',
  '5b7a9436832e136ee536608775887692fdb1e007e96d28c768506a7541cbef78',
  'a3fb000b634cdb6946ab570aedc70defe96376213716020313c12862fe7bd9bf',
  '12b7a62066bf4fce0a50abc0deec226a048837d46a91ca6901f8f63a5abc7fcc',
  '9d2c32edad8dbeab57e27540a70c75d0f4610d4ac614fc0efaec4ad9426c81de',
  '8d85162f8d5446e91b148dca15f572413e139a249acb8130906f8c02c46a237e',
  'c9911f7633718f2a7aad0416130ab91d8f7881654d0ce4ce08b0d8cd3692630c',
  '5f12b9684d3a6eee520735aba37dcb87bb248c697ebf52e5c276eac311b39ae5',
  'e99a057bfd31d969bdafc9daacc94f6bff1f14b0d307c836fa9b93c0d3314a46',
  'a3207de2b29b2102cf3f63ddd4a0dc949eec8acd271c6368bc68c709a26263b7',
  '4e8b3729eb08be32d46b23b7b5ce22ffc98b6a271b94de044a37363468e92f83',
  'a3fb000b634cdb6946ab570aedc70defe96376213716020313c12862fe7bd9bf',
  '12b7a62066bf4fce0a50abc0deec226a048837d46a91ca6901f8f63a5abc7fcc',
  '9d2c32edad8dbeab57e27540a70c75d0f4610d4ac614fc0efaec4ad9426c81de',
  'dfdd715e43779ae0502c228e0ea52efbb27700030348ede3d1c8d28c3f69642d',
  '2f1ab9d79f17fc21cb8611f40e0337c0c14a9276475c54c1eb774527e1e56f9a',
  '937478a381d136bb76a99992a85e25737bd931ab51b390099353e619f1cd251e',
  '10c8a3289da80c9623f23d2d8e8ade89a900b3ca00fa3a30282ccb328087796d',
  'd94682420f0e40974147f5e8bf2e96e85ade0f0f9a0fee857e460f2131869191',
  '46f7ccd7073d1c7dbee1f2278d985da488b87b20c4dc0c197c031e4d485ec8dd',
  '7eea4d515523cb4e8028e3e93d5cc1f3412710f3f5969e96b0bbe92d1f88df5e',
  'f5597394f79a565aeb1381a42127393c51387c91d6722d95857c13b709fe7f25',
  '4e8b3729eb08be32d46b23b7b5ce22ffc98b6a271b94de044a37363468e92f83',
  '553d0b20c65423237abd4522ca017f26d58c3d8003a3246384ad08bfffde6e7c',
  'f6078d2ccaa8101a8793cbb182e03325a354e98e512628601be5bdadfed19d8f',
  '12b7a62066bf4fce0a50abc0deec226a048837d46a91ca6901f8f63a5abc7fcc',
  '9d2c32edad8dbeab57e27540a70c75d0f4610d4ac614fc0efaec4ad9426c81de',
  '03276166a312359ae574b88c31d66c7b85c7b0869d1c0ac80577c341c2d19d2d',
  '423f58bb05bd1f9f2ca0e85889736592805b52f0ccf5da449c1c8a6723478d37',
  '13725d78845c655d1b93f325182ee871a0a6486f0f70d5a71e6d01d90b6940c7',
  '394fa95ed26bf593751ecb403861b51ef81f9e48152310ee4bbfe5b169538ce9',
  '4048939b036621a882f98df3ceaa6fb43f76d5d1ee309c98d69cb6b788053468',
  'b949c19f66eb4c6fb7c4954c84284d2d08ef5e966d7acc8fad3b9e89083fe472',
  'eac69eb2b68898557c7e3252e472dc4aa6f63ab19573e70b588433a2b2d14ecf',
]);
const NOTE_HASHES=new Set([
  'b6e28fd5a3e60e9baa5ea8c4f4863fb63394d1204d9e3a7ac0fb0321e793a23d',
  '818549dbd483fde36f5cfc0b792a35d4c7487d26828a5b28608ff24c4c3f946e',
  '9a85985097ce0d8ea8ab4dbc38083db9c3ec8e91de56d1a6c0c7276f1d61d67d',
  'cb06e30a7361884771cba3c4fc12e796762fb50715cb631a5d5ae8cc4409e90d',
  '9a33e3b721304afd5a753c15239cbc7a97b304c17ccd7f29db1134b9c5d88c59',
]);

const TEXT_EXT=/\.(js|mjs|cjs|css|html|json|txt|svg|map)$/i;
const GENERIC_MARKERS=[
 [/mentor-solutions/i,'retired module name "mentor-solutions"'],
 [/mentorSolutionFor|mentorSolutions\b/,'retired solution identifier'],
 [/Soluci[oó]n de referencia para mentor/,'header comment of the retired solutions'],
 [/sourceMappingURL/,'source map reference'],
];
const norm=line=>line.trim().replace(/\s+/g,' ');
const sha=text=>createHash('sha256').update(text).digest('hex');

async function walk(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())out.push(...await walk(path));else out.push(path);
 }
 return out;
}
const STRING_LITERAL=/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
function segments(text){
 const parts=new Set();
 for(const chunk of text.split(/\r?\n|\\n/))if(chunk.trim().length>=28)parts.add(norm(chunk));
 for(const m of text.matchAll(STRING_LITERAL)){
  const literal=m[1]??m[2]??m[3]??'';
  if(literal.length>=28)parts.add(norm(literal));
 }
 return parts;
}
export async function loadPrivateMarkers(file){
 if(!file)return {literals:[],hashes:new Set()};
 const lines=(await readFile(file,'utf8')).split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 return {literals:lines.filter(l=>!l.startsWith('sha256:')),hashes:new Set(lines.filter(l=>l.startsWith('sha256:')).map(l=>l.slice(7).toLowerCase()))};
}
/** Returns findings [{file,reason}]. Reasons never include the matched content. */
export async function auditDist(distDir,{lineHashes=LINE_HASHES,noteHashes=NOTE_HASHES,privateMarkers={literals:[],hashes:new Set()}}={}){
 if(!existsSync(distDir))throw new Error(`dist directory not found: ${distDir}`);
 const findings=[];
 for(const path of await walk(distDir)){
  const file=relative(distDir,path);
  if(/\.map$/i.test(path))findings.push({file,reason:'unexpected source map file'});
  if(/mentor-solutions/i.test(file))findings.push({file,reason:'file name contains "mentor-solutions"'});
  if(!TEXT_EXT.test(path))continue;
  const text=await readFile(path,'utf8');
  for(const [pattern,reason] of GENERIC_MARKERS)if(pattern.test(text))findings.push({file,reason});
  let hits=0;
  for(const part of segments(text)){const h=sha(part);if(lineHashes.has(h)||noteHashes.has(h)||privateMarkers.hashes.has(h))hits++;}
  if(hits)findings.push({file,reason:`${hits} line(s) match hashes of known mentor solutions`});
  privateMarkers.literals.forEach((literal,index)=>{if(text.includes(literal))findings.push({file,reason:`private marker #${index+1} present`});});
 }
 return findings;
}
async function selfTest(){
 const root=await mkdtemp(join(tmpdir(),'bitiro-dist-'));
 try{
  // Clean dist containing ONLY normal UI text: must pass (no false positive on the "Solución de referencia" label).
  const clean=join(root,'clean');await mkdir(join(clean,'assets'),{recursive:true});
  await writeFile(join(clean,'assets','app.js'),'export const label="Solución de referencia";const note="El mentor abre la referencia desde el servidor.";');
  if((await auditDist(clean)).length)throw new Error('self-test: clean dist was flagged');
  // Dirty dists: every layer must fail on its own synthetic marker.
  const probe='SYNTHETIC-FORBIDDEN-LINE-FOR-SELF-TEST';
  const cases=[
   ['module name',d=>writeFile(join(d,'assets','mentor-solutions-1.js'),'x')],
   ['source map',d=>writeFile(join(d,'assets','app.js.map'),'{}')],
   ['identifier',d=>writeFile(join(d,'assets','app.js'),'const a=mentorSolutionFor("s01");')],
   ['header comment',d=>writeFile(join(d,'assets','app.js'),'const s="// Solución de referencia para mentor";')],
   ['known line (real newlines)',d=>writeFile(join(d,'assets','app.js'),`const s=\`a\n${probe}\nb\`;`)],
   ['known line (escaped newlines, minified)',d=>writeFile(join(d,'assets','app.js'),`const s="a\\n${probe}\\nb";`)],
   ['private marker',d=>writeFile(join(d,'assets','app.js'),'const s="PRIVATE-SYNTHETIC-MARKER";')],
  ];
  const options={lineHashes:new Set([sha(probe)]),privateMarkers:{literals:['PRIVATE-SYNTHETIC-MARKER'],hashes:new Set()}};
  for(const [label,make] of cases){
   const dir=join(root,label.replace(/\W+/g,'_'));await mkdir(join(dir,'assets'),{recursive:true});await make(dir);
   if(!(await auditDist(dir,options)).length)throw new Error(`self-test: "${label}" was NOT detected`);
  }
  console.log(`dist solutions gate self-test OK: clean dist passes, ${cases.length} synthetic violations fail`);
 }finally{await rm(root,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 try{
  if(args.includes('--self-test'))await selfTest();
  else{
   const dist=args.find(a=>!a.startsWith('--'))??'dist';
   const findings=await auditDist(dist,{privateMarkers:await loadPrivateMarkers(process.env.BITIRO_SOLUTION_MARKERS_FILE)});
   if(findings.length){
    console.error(`DIST AUDIT FAILED: mentor solution content found in ${dist}/`);
    for(const f of findings)console.error(` - ${f.file}: ${f.reason}`);
    process.exit(1);
   }
   console.log(`dist solutions audit OK: ${dist}/ has no mentor solution content${process.env.BITIRO_SOLUTION_MARKERS_FILE?' (private markers checked)':' (private markers not configured)'}`);
  }
 }catch(error){console.error(`dist solutions audit error: ${error.message}`);process.exit(2);}
}
