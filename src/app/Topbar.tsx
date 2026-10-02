import {Link,NavLink,useLocation} from 'react-router-dom';
import {BookOpen,ChevronRight,UserRound,Building2,UsersRound,UserPlus} from 'lucide-react';
import {Brand} from '../components/Brand';
import {useAuth} from '../features/auth/AuthProvider';
import type {SessionDefinition} from '../content/sessions';
import type {WorkspaceSummary} from '../features/workspaces/workspace-types';
import {workspacePath} from '../features/workspaces/workspace-paths';

export function Topbar({session,workspace,onGuide}:{session?:SessionDefinition;workspace?:WorkspaceSummary;onGuide:()=>void}) {
  const {status,profile,membership}=useAuth();
  const {pathname}=useLocation();
  const authenticated=status==='authenticated';
  const isLanding=pathname==='/';
  const mustakis=workspace?.organization_id==='mustakis';
  const brandTarget=workspace?workspacePath(workspace):'/';
  return <header className={`topbar ${session?'topbar-lab':''} ${mustakis?'topbar-mustakis':''}`}><Brand to={brandTarget}/>
    {session?<nav className={`lab-breadcrumbs ${mustakis?'institution-breadcrumbs':''}`} aria-label="Ruta de navegación"><Link to={workspace?workspacePath(workspace):'/espacios'}>{mustakis?'Robótica':'Mi programa'}</Link><ChevronRight size={14}/><span>Sesión {String(session.number).padStart(2,'0')}</span></nav>:workspace?<nav className={`workspace-breadcrumbs ${mustakis?'institution-breadcrumbs':''}`} aria-label="Ruta de navegación"><Link to="/espacios">Mi programa</Link><ChevronRight size={14}/><span>{mustakis?'Robótica Educativa':workspace.organization_name}</span><ChevronRight size={14}/><span>{workspace.cohort_name}</span></nav>:<nav className="primary-nav" aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink>{authenticated&&<NavLink to="/espacios">Mi programa</NavLink>}</nav>}
    <div className="topbar-actions">{workspace&&<span className="workspace-chip"><Building2 size={14}/>{workspace.site_name??workspace.organization_name}</span>}{membership&&membership.role!=='participant'&&!workspace&&<Link className="icon-button team-link" to="/equipo" aria-label="Gestión de plataforma"><UsersRound size={19}/></Link>}{session&&<button className="guide-button" data-tour="guide" aria-label="Abrir guía y conceptos" onClick={onGuide}><BookOpen size={18}/><span>Guía</span></button>}{authenticated?<Link aria-label="Mi cuenta" className="account-button" to="/cuenta"><UserRound size={17}/><span>{profile?.display_name?.split(' ')[0]||'Mi cuenta'}</span></Link>:<>{!isLanding&&<Link className="header-register" aria-label="Crear cuenta" to="/registro?next=%2Fespacios"><UserPlus size={16}/><span>Crear cuenta</span></Link>}<Link aria-label="Ingresar" className="login-link" to="/login?next=%2Fespacios"><UserRound size={17}/><span>Ingresar</span></Link></>}</div>
  </header>;
}
