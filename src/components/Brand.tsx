import {Link} from 'react-router-dom';
export function Brand({compact=false,to='/'}:{compact?:boolean;to?:string}) {
  return <Link className="brand" to={to} aria-label={to==='/'?'BITIRO Lab, inicio':'BITIRO Lab, volver al grupo'}><img src="/brand/bitiro-symbol-64.png" alt="" width="38" height="38"/><span><strong>BITIRO <span>Lab</span></strong>{!compact&&<small>Laboratorio de robótica</small>}</span></Link>;
}
