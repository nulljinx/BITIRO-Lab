import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzip,brotliCompress,constants} from 'node:zlib';
import {promisify} from 'node:util';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),process.env.BITIRO_E2E_BUILD==='1'?'../dist-e2e':'../dist');
const port=Number(process.env.PORT||5198);
const compressGzip=promisify(gzip),compressBr=promisify(brotliCompress);
const cached=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon'};
const csp=["default-src 'self'","script-src 'self'","style-src 'self' 'unsafe-inline'","worker-src 'self'","img-src 'self' data: blob:","font-src 'self'","connect-src 'self' https://*.supabase.co wss://*.supabase.co","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'"].join('; ');
const security={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Frame-Options':'DENY'};
function accepts(header,name){return header.split(',').some(part=>{const [encoding,...parameters]=part.trim().split(';');return encoding===name&&!parameters.some(p=>/^q=0(?:\.0*)?$/.test(p.trim()));});}
export const server=http.createServer(async(req,res)=>{
  const fail=(status,message)=>{res.writeHead(status,{...security,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message);};
  try{
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');fail(405,'Método no permitido.');return;}
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{fail(400,'Ruta no válida.');return;}
    const file=path.resolve(root,'.'+pathname),relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||pathname.includes('\0')){fail(403,'Ruta no permitida.');return;}
    let target=file,info;
    try{info=await stat(target);if(!info.isFile())throw new Error('directory');}catch{if(path.extname(pathname)||relative.startsWith('assets'+path.sep)){fail(404,'Archivo no encontrado.');return;}target=path.join(root,'index.html');info=await stat(target);}
    const etag=`W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const extension=path.extname(target),type=mime[extension]||'application/octet-stream';
    const headers={...security,'Content-Type':type,'Cache-Control':relative.startsWith('assets'+path.sep)?'public, max-age=31536000, immutable':'no-cache','ETag':etag,'Vary':'Accept-Encoding'};
    if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return;}
    const accepted=String(req.headers['accept-encoding']||'');
    const compressible=['.js','.css','.html','.json','.svg'].includes(extension)&&info.size>1000;
    const encoding=compressible?(accepts(accepted,'br')?'br':accepts(accepted,'gzip')?'gzip':''):'';
    const cacheKey=target+etag+encoding;
    let body=cached.get(cacheKey);
    if(!body){body=await readFile(target);if(encoding==='br')body=await compressBr(body,{params:{[constants.BROTLI_PARAM_QUALITY]:4}});else if(encoding==='gzip')body=await compressGzip(body);if(cached.size>=30)cached.delete(cached.keys().next().value);cached.set(cacheKey,body);}
    if(encoding)headers['Content-Encoding']=encoding;
    headers['Content-Length']=body.length;
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
  }catch{fail(500,'No se pudo abrir la aplicación. Ejecuta pnpm build y vuelve a iniciar.');}
}).listen(port,'127.0.0.1',()=>console.log(`BITIRO Lab 6 · http://127.0.0.1:${port}/intermedio`));
