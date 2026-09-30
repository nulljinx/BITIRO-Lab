import { useEffect, useRef, useState } from 'react';
import type { SessionDefinition } from '../../content/sessions';
import {X,Plus} from 'lucide-react';
import { api } from '../../content/api';
export function Guide({session,onClose}:{session:SessionDefinition;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null),[query,setQuery]=useState('');
  useEffect(()=>{ref.current?.showModal();const el=ref.current;return()=>el?.close();},[]);
  const entries=api.filter(a=>a.since<=session.number && `${a.name} ${a.description}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog ref={ref} className="guide" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}} aria-labelledby="guide-title"><div className="guide-content"><div className="section-heading"><div><span className="eyebrow">APRENDE A TU RITMO</span><h2 id="guide-title">Guía y conceptos</h2></div><button onClick={onClose} aria-label="Cerrar guía" className="icon-button"><X size={20}/></button></div><p>Sesión {session.number} · {session.title}</p><div className="concept-pills">{session.concepts.map(c=><span key={c}>{c}</span>)}</div>
    <section className="concept-note"><h3>Una señal no es una orden</h3><p>Los sensores describen lo que ocurre. Tu programa interpreta esas lecturas y decide cómo mover el robot.</p><h3>Calibra antes de comparar</h3><p>Los sensores pueden entregar lecturas distintas entre sí y según la zona. Mide blanco y negro antes de elegir cada umbral.</p></section>
    {session.id==='s03'&&<section className="concept-note s03-guide-note"><span className="eyebrow">SESIÓN 03</span><h3>Contar significa guardar un estado.</h3><p>Un contador es una variable entera que cambia cuando ocurre un evento. Puede comenzar en <code>0</code> y aumentar de uno en uno con <code>contador++</code>.</p><pre>{`int contador = 0;
contador++;`}</pre><h3><code>while</code> repite mientras una condición siga siendo verdadera.</h3><p>Úsalo cuando necesites mantener una acción o una espera mientras una condición continúa activa. BITIRO no muestra aquí la solución del desafío: decide tú dónde puede servir.</p><pre>{`while (condicion) {
  // se repite mientras condicion sea verdadera
}`}</pre><h3>Sonar: trabaja con un rango útil.</h3><p>El material de la sesión recomienda evitar los extremos de la lectura y comparar dentro de un intervalo, por ejemplo <code>distancia &gt; 5 &amp;&amp; distancia &lt; 12</code>.</p></section>}
    <section className="programming-note" aria-label="Programación C++ disponible"><div><span className="eyebrow">PROGRAMACIÓN</span><h3>También puedes organizar tu propio código.</h3><p>BITIRO admite variables del mismo tipo separadas por comas, funciones propias con parámetros y retorno, y control de ciclos con <code>break</code> y <code>continue</code>.</p></div><pre>{`int si, sc, sd;
int izquierda = 210, centro = 225, derecha = 238;

int promedio(int a, int b) {
  return (a + b) / 2;
}

void seguirLinea(int velocidad) {
  avanzar(velocidad);
}`}</pre></section>
    <section className="programming-note logical-note" aria-label="Comparaciones lógicas AND y OR"><div><span className="eyebrow">COMPARACIONES</span><h3>Combina varias condiciones con <code>&amp;&amp;</code> y <code>||</code>.</h3><p><code>&amp;&amp;</code> significa “y”: todas las condiciones deben cumplirse. <code>||</code> significa “o”: basta con que una de ellas se cumpla. BITIRO también respeta el cortocircuito de C++.</p></div><pre>{`if (si < UMBRAL_I && sc > UMBRAL_C && sd < UMBRAL_D) {
  avanzar(30);
}

if (irIzq == 1 || irDer == 1) {
  detenerse();
}`}</pre></section>
    <label className="search-label">Buscar una función<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Por ejemplo: pantalla, sonar, avanzar" type="search"/></label><p className="small muted">Nombres y firmas verificados en KnightRoboticsLibs_Iroh V4.</p>
    <div className="api-list">{entries.map(a=><details key={a.name}><summary>{a.name}<Plus size={16} aria-hidden="true"/></summary><p><code>{a.signature}</code></p><p>{a.description}</p><pre>{a.example}</pre></details>)}{!entries.length&&<p>No encontramos esa función. Prueba con otro término.</p>}</div><section className="concept-note"><span className="eyebrow">DESAFÍO EXTRA</span><p>{session.bonus}</p></section><p className="small muted">Fuente: {session.source}. Material educativo de Fundación Gabriel & Mary Mustakis y universidades socias. CC BY-NC-SA.</p></div></dialog>;
}
