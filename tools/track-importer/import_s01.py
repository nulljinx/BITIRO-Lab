"""Import the verified S01 black paths, excluding logos. No SVG in runtime.
Usage: python import_s01.py input.svg output.json
Units: viewBox -> 100 x 140 cm. Cubic curves sampled at <= 0.15 cm.
Supported SVG subset for this source: M/m, L/l, H/h, V/v, C/c, Z/z.
Reject unsupported commands/transforms instead of silently losing geometry.
"""
import argparse, json, math, re, hashlib
import xml.etree.ElementTree as ET
from pathlib import Path

def flatten(d, sx, sy):
    tokens=re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',d)
    i=0; cmd=None; p=(0.,0.); start=p; result=[]
    def point(q): return {'x':round(q[0]*sx,5),'y':round(q[1]*sy,5)}
    def push(q): result.append(point(q))
    while i<len(tokens):
        if tokens[i].isalpha(): cmd=tokens[i]; i+=1
        if not cmd or cmd.upper() not in 'MLHVCZ': raise ValueError('Unsupported SVG command: '+str(cmd))
        c=cmd.upper(); relative=cmd.islower()
        if c=='Z': p=start; push(p); cmd=None; continue
        count={'M':2,'L':2,'H':1,'V':1,'C':6}[c]
        v=list(map(float,tokens[i:i+count])); i+=count
        def coord(x,y): return (x+p[0],y+p[1]) if relative else (x,y)
        if c in 'ML':
            p=coord(*v); push(p)
            if c=='M': start=p; cmd='l' if relative else 'L'
        elif c=='H': p=(p[0]+v[0] if relative else v[0],p[1]); push(p)
        elif c=='V': p=(p[0],p[1]+v[0] if relative else v[0]); push(p)
        else:
            a=p; b=coord(v[0],v[1]); cc=coord(v[2],v[3]); end=coord(v[4],v[5])
            n=max(8,math.ceil(sum(math.hypot((q[0]-r[0])*sx,(q[1]-r[1])*sy) for q,r in [(a,b),(b,cc),(cc,end)])/.15))
            for step in range(1,n+1):
                t=step/n; u=1-t
                push(tuple(u**3*a[k]+3*u*u*t*b[k]+3*u*t*t*cc[k]+t**3*end[k] for k in (0,1)))
            p=end
    return result

def convert(src):
    root=ET.parse(src).getroot(); box=list(map(float,root.attrib['viewBox'].split()))
    sx=100/box[2]; sy=140/box[3]; paths=[]; zones=[]
    def walk(node,transformed=False):
        transformed=transformed or bool(node.get('transform'))
        if node.get('stroke')=='#000000' and float(node.get('stroke-width','0'))>70:
            if transformed: raise ValueError('Track path has unsupported transform')
            tag=node.tag.split('}')[-1]
            if tag=='line': points=[{'x':float(node.get('x'+str(i)))*sx,'y':float(node.get('y'+str(i)))*sy} for i in (1,2)]
            elif tag=='path': points=flatten(node.get('d'),sx,sy)
            else: raise ValueError('Unsupported track element '+tag)
            paths.append({'id':node.get('id'),'widthCm':float(node.get('stroke-width'))*sx,'lineCap':node.get('stroke-linecap','butt'),'points':points})
        if node.get('id') in ['rect270','rect272']:
            zones.append({'id':node.get('id'),'label':'Base izquierda' if len(zones)==0 else 'Base derecha','x':float(node.get('x'))*sx,'y':float(node.get('y'))*sy,'width':float(node.get('width'))*sx,'height':float(node.get('height'))*sy})
        for child in node: walk(child,transformed)
    walk(root)
    if len(paths)!=10 or len(zones)!=2: raise ValueError('Source differs from verified S01; inspect before importing')
    return {'id':'s01','physicalWidthCm':100,'physicalHeightCm':140,'source':src.name,'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'paths':paths,'finishZones':zones,'start':{'x':50,'y':117,'heading':-math.pi/2},'obstacles':[{'id':'practice-box','x':46,'y':94,'width':8,'height':8,'movable':True}],'notes':'Exact source paths. Start pose and obstacle position are editable laboratory configuration, not printed locations.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('source',type=Path); parser.add_argument('output',type=Path); args=parser.parse_args()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(convert(args.source),ensure_ascii=False,separators=(',',':')),encoding='utf-8')

