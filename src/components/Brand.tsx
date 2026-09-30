import {Link} from 'react-router-dom';
export function Brand({compact=false}:{compact?:boolean}) {
  return <Link className="brand" to="/" aria-label="BITIRO Lab, inicio"><img src="/brand/bitiro-symbol-64.png" alt="" width="38" height="38"/><span><strong>BITIRO <span>Lab</span></strong>{!compact&&<small>Laboratorio de robótica</small>}</span></Link>;
}
