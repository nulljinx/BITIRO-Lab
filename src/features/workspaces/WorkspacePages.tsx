import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,Building2,Check,Code2,KeyRound,LockKeyhole,MapPin,RefreshCw,ShieldCheck,UsersRound,BookOpen,UserRound,Play,ExternalLink,Eye,EyeOff,Layers3,Users,Plus,X,Copy,UserPlus,Ban,Sparkles,Target,Lightbulb,Compass} from 'lucide-react';
import {sessions} from '../../content/sessions';
import {initialSites} from '../../content/sites';
import {organizationPresentations} from '../../content/organizations';
import {explored,lastVisited,workspaceStorageScope} from '../code-editor/storage';
import {useAuth} from '../auth/AuthProvider';
import {useWorkspaces} from './WorkspaceProvider';
import type {CohortLearningRow,MentorWorkspaceOverview,ParticipantInvite,WorkspaceParticipant,WorkspaceSessionAccess,WorkspaceSummary} from './workspace-types';
import {workspaceMentorPath,workspacePath,workspaceSessionPath} from './workspace-paths';

function roleLabel(role:WorkspaceSummary['role']){return role==='participant'?'Participante':role==='mentor'?'Mentor':'Administración';}
function workspaceActionLabel(role:WorkspaceSummary['role']){return role==='participant'?'Entrar al programa':role==='mentor'?'Gestionar grupo':'Administrar espacio';}

const landingPartnerBrand:Record<string,{logo?:string;short:string}>={
  'Fundación Mustakis':{logo:'/brand/mustakis/mustakis-logo.webp',short:'Mustakis'},
  'Universidad de Talca':{logo:'/brand/mustakis/talca-logo.png',short:'UTalca'},
  'Universidad Técnica Federico Santa María':{short:'USM'},
  'Universidad de O’Higgins':{short:'UOH'},
  'Universidad de La Frontera':{short:'UFRO'},
  'Universidad Austral de Chile':{short:'UACh'},
};

export function LandingPage(){
  const auth=useAuth(),authenticated=auth.status==='authenticated';
  const renderSite=(site:(typeof initialSites)[number])=>{const brand=landingPartnerBrand[site.partner]??{short:site.partner};return <article className="landing-site-card" key={site.id}><div className={`landing-site-brand ${brand.logo?'has-logo':'is-wordmark'}`}>{brand.logo?<img src={brand.logo} alt={`Identidad de ${site.partner}`}/>:<span aria-hidden="true">{brand.short}</span>}</div><div><strong>{site.name}</strong><span>{site.partner}</span></div></article>;};

  return <main id="main" className="landing-page">
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="eyebrow">Fundación Mustakis · Ciencia y Tecnología</span>
        <h1>Aprende robótica<br/>programando al <em>IROH.</em></h1>
        <p>BITIRO Lab acompaña las sesiones de Robótica Educativa: comprende el desafío, escribe tu programa, pruébalo en el simulador y mejora tu solución.</p>
        <div className="button-row">{authenticated?<Link className="primary" to="/espacios">Ir a mi programa<ArrowRight size={17}/></Link>:<><Link className="primary" to="/registro?next=%2Fespacios">Crear cuenta<ArrowRight size={17}/></Link><Link className="button" to="/login?next=%2Fespacios">Ya tengo cuenta</Link></>}</div>
        <span className="landing-note">Si participas en el programa, tu mentor te entregará el código necesario para vincular tu grupo a la cuenta.</span>
      </div>

      <figure className="landing-mascot-stage" aria-label="IROH explica el ciclo Comprende, Programa y Prueba de BITIRO Lab">
        <span className="landing-orbit landing-orbit-main" aria-hidden="true"/>
        <span className="landing-orbit landing-orbit-secondary" aria-hidden="true"/>

        <article className="landing-hero-card is-understand">
          <span className="landing-hero-card-badge">01</span>
          <span className="landing-hero-card-icon"><BookOpen size={18}/></span>
          <span className="landing-hero-card-copy"><strong>Comprende</strong><small>Entiende el desafío</small></span>
        </article>

        <article className="landing-hero-card is-program">
          <span className="landing-hero-card-badge">02</span>
          <span className="landing-hero-card-icon"><Code2 size={18}/></span>
          <span className="landing-hero-card-copy"><strong>Programa</strong><small>Construye tu solución</small></span>
        </article>

        <article className="landing-hero-card is-test">
          <span className="landing-hero-card-badge">03</span>
          <span className="landing-hero-card-icon"><Play size={18}/></span>
          <span className="landing-hero-card-copy"><strong>Prueba</strong><small>Observa, ajusta y mejora</small></span>
        </article>

        <img className="landing-mascot-cutout" src="/brand/iroh/iroh-mustakis-hero-cutout.webp" alt="IROH con polerón azul de Fundación Mustakis" fetchPriority="high"/>
      </figure>
    </section>

    <section className="landing-institutions">
      <div className="landing-institutions-copy">
        <span className="eyebrow">Programa Ciencia y Tecnología</span>
        <h2>Una herramienta para aprender haciendo.</h2>
        <p>El simulador, la guía y los desafíos siguen el contenido del programa de Fundación Mustakis. El foco está en experimentar con el IROH y comprender qué efecto produce cada decisión de programación.</p>
        <div className="landing-learning-points"><span><Code2 size={16}/>Programación aplicada</span><span><Target size={16}/>Desafíos por sesión</span><span><Sparkles size={16}/>Experimentación y mejora</span></div>
      </div>

      <aside className="institution-example" aria-label="Fundación Mustakis, Programa Ciencia y Tecnología">
        <div className="institution-example-brand">
          <span className="institution-example-kicker">Fundación Mustakis</span>
          <img className="institution-example-logo" src="/brand/mustakis/mustakis-logo.webp" alt="Fundación Gabriel & Mary Mustakis"/>
        </div>
        <div className="institution-example-copy">
          <span className="eyebrow">Programa Ciencia y Tecnología</span>
          <strong>Robótica Educativa</strong>
          <p>BITIRO Lab acompaña la práctica de cada sesión con simulación, programación y contenidos de apoyo.</p>
          <span className="institution-example-signature">Comprender · programar · experimentar</span>
        </div>
      </aside>
    </section>

    <section className="landing-sites" aria-labelledby="landing-sites-title">
      <header><span className="eyebrow">Programa CyT</span><h2 id="landing-sites-title">Sedes participantes</h2><p>La experiencia de Robótica Educativa se desarrolla en distintas sedes del programa. BITIRO mantiene una presentación visual uniforme mientras incorporamos los recursos institucionales aprobados.</p></header>
      <div className="landing-sites-rail" tabIndex={0} aria-label="Sedes participantes. Puedes desplazarte horizontalmente para recorrerlas.">
        <div className="landing-sites-track">
          <div className="landing-sites-set">{initialSites.map(renderSite)}</div>
          <div className="landing-sites-set" aria-hidden="true">{initialSites.map(site=>{const brand=landingPartnerBrand[site.partner]??{short:site.partner};return <article className="landing-site-card" key={`copy-${site.id}`}><div className={`landing-site-brand ${brand.logo?'has-logo':'is-wordmark'}`}>{brand.logo?<img src={brand.logo} alt=""/>:<span>{brand.short}</span>}</div><div><strong>{site.name}</strong><span>{site.partner}</span></div></article>;})}</div>
        </div>
      </div>
      <p className="landing-sites-note">Los logotipos adicionales se incorporarán únicamente con archivos institucionales autorizados por cada sede.</p>
    </section>

    <footer className="landing-footer"><div><strong>BITIRO Lab</strong><span>Fundación Mustakis · Ciencia y Tecnología · Robótica Educativa</span></div><nav aria-label="Enlaces del pie de página"><Link to="/privacidad">Privacidad</Link><Link to="/login?next=%2Fespacios">Ingresar</Link></nav></footer>
  </main>;
}

export function SpacesPage(){
  const auth=useAuth(),workspaces=useWorkspaces();
  const dialogRef=useRef<HTMLDialogElement>(null);
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [redeemOpen,setRedeemOpen]=useState(false),[addedWorkspace,setAddedWorkspace]=useState<WorkspaceSummary|null>(null);
  const firstName=auth.profile?.display_name?.split(' ')[0]||'hola';
  const hasWorkspaces=workspaces.workspaces.length>0;

  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog)return;
    if(redeemOpen&&!dialog.open)dialog.showModal();
    if(!redeemOpen&&dialog.open)dialog.close();
  },[redeemOpen]);

  function resetRedeem(){setCode('');setError('');setAddedWorkspace(null);}
  function openRedeem(){resetRedeem();setRedeemOpen(true);}
  function closeRedeem(){setRedeemOpen(false);resetRedeem();}
  async function redeem(){
    setBusy(true);setError('');
    try{
      const workspace=await workspaces.redeemCode(code);
      setCode('');setAddedWorkspace(workspace);setRedeemOpen(true);
    }catch(e){setError(e instanceof Error?e.message:'Código no válido o no disponible.');}
    finally{setBusy(false);}
  }
  function RedeemForm(){return <>
    <p>El código identifica el programa, sede y grupo Mustakis al que perteneces. Solo tienes que vincularlo una vez a tu cuenta BITIRO.</p>
    <label className="form-field">Código de acceso<input value={code} onChange={event=>setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={64} placeholder="XXXX-XXXX-XXXX"/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="primary" type="button" disabled={busy||code.trim().length<8} onClick={()=>void redeem()}><KeyRound size={17}/>{busy?'Validando…':'Añadir a mi cuenta'}</button>
    <p className="redeem-help"><ShieldCheck size={15}/>El código no reemplaza el inicio de sesión. Una vez aceptado, tu grupo queda asociado a la cuenta.</p>
  </>;}

  return <main id="main" className="content-page spaces-page"><header className="page-heading spaces-heading"><span className="eyebrow">Fundación Mustakis · BITIRO Lab</span><h1>Hola, {firstName}.</h1><p>{hasWorkspaces?'Este es el programa y grupo que tienes vinculados a tu cuenta.':'Tu cuenta ya está lista. Vincula el grupo que te haya entregado tu mentor.'}</p></header>
    {hasWorkspaces?<section className="spaces-hub"><div className="section-heading spaces-hub-heading"><div><span className="eyebrow">Mi programa</span><h2>Robótica Educativa.</h2><p className="muted">Entra a tu grupo para acceder a las sesiones, contenidos y laboratorio del IROH.</p></div><button className="button spaces-add-button" type="button" onClick={openRedeem}><Plus size={17}/>Vincular grupo</button></div>
      {workspaces.error&&<p className="form-error" role="alert">{workspaces.error}</p>}
      {workspaces.loading?<div className="workspace-state" role="status"><RefreshCw className="spin" size={20}/><div><strong>Actualizando tus espacios…</strong><p>Estamos comprobando tus programas y grupos.</p></div></div>:<div className="workspace-directory workspace-directory-grid">{workspaces.workspaces.map(item=>{const org=organizationPresentations[item.organization_id];return <Link className={`workspace-card workspace-card-rich role-${item.role} ${org?.theme?`theme-${org.theme}`:''}`} key={`${item.organization_id}-${item.cohort_id}`} to={workspacePath(item)} aria-label={`${workspaceActionLabel(item.role)}: ${org?.name??item.organization_name}, ${item.program_name}, ${item.cohort_name}`}><div className="workspace-card-top"><span className={`workspace-mark ${org?.logoUrl&&org?.theme!=='mustakis'?'has-logo':''}`}>{org?.logoUrl&&org?.theme!=='mustakis'?<img src={org.logoUrl} alt=""/>:<Building2 size={22}/>}</span><span className="workspace-role-badge"><UserRound size={14}/>{roleLabel(item.role)}<small>Rol en este espacio</small></span></div><div className="workspace-card-copy">{org?.theme==='mustakis'&&<span className="workspace-card-brandline">Robótica Educativa</span>}{org?.logoUrl&&org?.theme==='mustakis'&&<div className="workspace-card-logo-strip"><img src={org.logoUrl} alt={`Logotipo de ${org.name}`}/></div>}<h3>{org?.name??item.organization_name}</h3><strong>{item.program_name}</strong><div className="workspace-card-meta"><span><MapPin size={14}/>{item.site_name??'Sede asignada'}</span><span><UsersRound size={14}/>{item.cohort_name}</span></div>{org?.partnerName&&<span className="workspace-card-partner">Sede aliada · {org.partnerName}</span>}</div><span className="workspace-card-action">{workspaceActionLabel(item.role)}<ArrowRight size={17}/></span></Link>;})}</div>}
    </section>:<div className="spaces-layout is-onboarding"><section><div className="section-heading"><div><span className="eyebrow">Primer acceso</span><h2>¿Tu mentor te dio un código?</h2><p className="muted">El código vincula tu cuenta BITIRO con tu sede y grupo del programa de Robótica Educativa. Solo tienes que usarlo una vez.</p></div>{workspaces.loading&&<RefreshCw className="spin" size={18}/>}</div>{workspaces.error&&<p className="form-error" role="alert">{workspaces.error}</p>}<div className="empty-workspace"><KeyRound size={25}/><h3>Tu cuenta todavía no tiene un grupo vinculado.</h3><p>Usa el código que te entregó tu mentor para entrar a tu programa.</p></div></section><aside className="redeem-panel"><span className="eyebrow">Código de grupo</span><h2>Únete a Robótica Educativa.</h2><RedeemForm/></aside></div>}

    <dialog ref={dialogRef} className="spaces-dialog" aria-labelledby="spaces-dialog-title" onClose={()=>{setRedeemOpen(false);resetRedeem();}}><div className="spaces-dialog-shell"><button className="icon-button spaces-dialog-close" type="button" aria-label="Cerrar" onClick={closeRedeem}><X size={19}/></button>{addedWorkspace?(()=>{const org=organizationPresentations[addedWorkspace.organization_id];return <div className="spaces-redeem-success"><span className="success-symbol"><Check size={21}/></span><span className="eyebrow">Grupo vinculado</span><h2 id="spaces-dialog-title">{org?.name??addedWorkspace.organization_name}</h2><p>Te uniste como <strong>{roleLabel(addedWorkspace.role)}</strong> a <strong>{addedWorkspace.program_name}</strong>.</p><div className="spaces-success-context"><span><MapPin size={15}/>{addedWorkspace.site_name??'Sede asignada'}</span><span><UsersRound size={15}/>{addedWorkspace.cohort_name}</span><span><UserRound size={15}/>{roleLabel(addedWorkspace.role)}</span></div><div className="button-row"><Link className="primary" to={workspacePath(addedWorkspace)} onClick={closeRedeem}>{workspaceActionLabel(addedWorkspace.role)}<ArrowRight size={16}/></Link><button className="button" type="button" onClick={closeRedeem}>Seguir en Mi programa</button></div></div>;})():<div className="spaces-dialog-form"><span className="eyebrow">Código de grupo</span><h2 id="spaces-dialog-title">Vincular mi grupo.</h2><RedeemForm/></div>}</div></dialog>
  </main>;
}

export function OrganizationWorkspacePage({workspace}:{workspace:WorkspaceSummary}){
  const org=organizationPresentations[workspace.organization_id],service=useWorkspaces(),auth=useAuth();
  const [access,setAccess]=useState<WorkspaceSessionAccess[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [overview,setOverview]=useState<MentorWorkspaceOverview|null>(null),[updating,setUpdating]=useState(''),[notice,setNotice]=useState('');
  const scope=auth.user?.id?workspaceStorageScope(auth.user.id,workspace.cohort_id):undefined;
  async function load(){
    setLoading(true);setError('');
    try{
      const sessionsAccess=await service.loadSessionAccess(workspace);setAccess(sessionsAccess);
      if(workspace.can_manage)setOverview(await service.loadMentorOverview(workspace));else setOverview(null);
    }
    catch(e){setAccess([]);setOverview(null);setError(e instanceof Error?e.message:'No pudimos cargar los contenidos.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[workspace.cohort_id,workspace.can_manage]);
  const releaseMap=useMemo(()=>new Map(access.map(item=>[item.session_id,item])),[access]);
  const visited=useMemo(()=>new Set(explored(scope)),[scope]);
  const last=lastVisited(scope);
  const releasedInteractive=sessions.filter(session=>session.interactive&&Boolean(releaseMap.get(session.id)?.released));
  const nextParticipantSession=releasedInteractive.find(session=>!visited.has(session.id))??releasedInteractive.find(session=>session.id===last)??releasedInteractive[0];
  const nextMentorSession=sessions.filter(session=>session.interactive).find(session=>!releaseMap.get(session.id)?.released);
  const firstName=auth.profile?.display_name?.split(' ')[0]||'Hola';
  const isMentor=workspace.can_manage;
  const isMustakis=org?.theme==='mustakis';
  const visitedReleased=releasedInteractive.filter(session=>visited.has(session.id)).length;
  const progress=releasedInteractive.length?Math.round((visitedReleased/releasedInteractive.length)*100):0;
  async function quickRelease(sessionId:string,released:boolean){
    setUpdating(sessionId);setError('');setNotice('');
    try{await service.setSessionRelease(workspace,sessionId,released);setNotice(released?'Práctica publicada para el grupo.':'Práctica ocultada para el grupo.');await load();}
    catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el cambio.');}
    finally{setUpdating('');}
  }
  return <main id="main" className={`institution-page ${isMentor?'is-mentor-view':'is-participant-view'} ${isMustakis?'theme-mustakis':''}`}>
    <section className="institution-hero mustakis-hero mustakis-hero-v71">
      <div className="institution-copy mustakis-hero-copy">
        <span className="eyebrow">{org?.programName??workspace.program_name}</span>
        <span className="mustakis-welcome-label">{isMentor?'Espacio de mentoría':`Bienvenido, ${firstName}`}</span>
        <h1>{workspace.program_name}</h1>
        <p>{isMentor?'Prepara las prácticas, publica contenidos cuando corresponda y acompaña el avance del grupo desde un solo espacio.':'Continúa practicando los desafíos trabajados en tu taller, prueba tus soluciones con el IROH y avanza a tu ritmo.'}</p>
        <div className="institution-meta"><span><MapPin size={15}/>{workspace.site_name??'Sede asignada'}</span><span><UsersRound size={15}/>{workspace.cohort_name}</span><span><UserRound size={15}/>{roleLabel(workspace.role)}</span></div>
      </div>
      {isMentor?<aside className="mentor-hero-summary mustakis-focus-card" aria-live="polite"><span className="eyebrow">Contenido del programa</span>{loading?<div className="mentor-summary-loading"><RefreshCw className="spin" size={22}/><span>Actualizando…</span></div>:error?<><h2>Resumen no disponible</h2><p>Reintenta para comprobar miembros y publicaciones.</p><button className="button" onClick={()=>void load()}><RefreshCw size={16}/>Reintentar</button></>:<><div className="mentor-summary-grid"><div><BookOpen size={20}/><strong>{releasedInteractive.length}</strong><span>sesiones disponibles</span></div><div><Layers3 size={20}/><strong>{sessions.filter(session=>session.interactive).length}</strong><span>laboratorios implementados</span></div></div>{nextMentorSession?<div className="mentor-next-action"><span>S{String(nextMentorSession.number).padStart(2,'0')} · siguiente por publicar</span><strong>{nextMentorSession.title}</strong><button className="primary compact" disabled={updating===nextMentorSession.id} onClick={()=>void quickRelease(nextMentorSession.id,true)}><Eye size={16}/>{updating===nextMentorSession.id?'Publicando…':'Publicar ahora'}</button></div>:<div className="mentor-next-action"><Check size={20}/><strong>Prácticas interactivas al día</strong><span>No hay otra práctica implementada pendiente de publicar.</span></div>}</>}</aside>
      :<aside className="next-practice mustakis-focus-card" aria-live="polite"><span className="eyebrow">{loading?'Comprobando contenidos':error?'Acceso no disponible':'Tu próxima práctica'}</span>{loading?<><RefreshCw className="spin" size={24}/><h2>Comprobando tus prácticas…</h2><p>No mostramos contenido hasta confirmar los permisos de este grupo.</p></>:error?<><LockKeyhole size={24}/><h2>No pudimos cargar el grupo.</h2><p>Revisa tu conexión y vuelve a intentarlo.</p><button className="button" onClick={()=>void load()}><RefreshCw size={16}/>Reintentar</button></>:nextParticipantSession?<><div className="mustakis-next-head"><span className="next-session-ref">S{String(nextParticipantSession.number).padStart(2,'0')}</span><span className="mustakis-progress-label">{progress}% recorrido</span></div><h2>{nextParticipantSession.title}</h2><p>{nextParticipantSession.summary}</p><div className="mustakis-progress" aria-label={`${progress}% del contenido publicado visitado`}><span style={{width:`${progress}%`}}/></div><Link className="primary" to={workspaceSessionPath(workspace,nextParticipantSession.id)}><Play size={16}/>{visited.has(nextParticipantSession.id)?'Continuar práctica':'Abrir laboratorio'}<ArrowRight size={16}/></Link></>:<><BookOpen size={24}/><h2>Todo al día.</h2><p>Cuando tu mentor publique una práctica nueva aparecerá aquí.</p></>}</aside>}
      {isMustakis&&<div className="mustakis-grid-motif" aria-hidden="true"/>}
    </section>

    {isMustakis&&<section className="mustakis-alliance-band" aria-label="Alianza institucional"><div className="mustakis-alliance-copy"><span className="eyebrow">Una experiencia desarrollada junto a</span><strong>{org?.name??workspace.organization_name}</strong><span>{org?.programName}</span></div><div className="mustakis-alliance-logos">{org?.logoUrl&&<div className="mustakis-alliance-logo"><img src={org.logoUrl} alt={`Logotipo de ${org.name}`}/></div>}<span className="mustakis-alliance-divider" aria-hidden="true"/>{org?.partnerLogoUrl&&<div className="mustakis-alliance-logo is-partner"><img src={org.partnerLogoUrl} alt={`Logotipo de ${org.partnerName??'institución aliada'}`}/></div>}</div><div className="mustakis-alliance-platform"><span>Plataforma tecnológica</span><strong>BITIRO Lab</strong><small>{org?.partnerLabel??'Sede Talca'}</small></div></section>}

    {isMustakis&&<section className="mustakis-method-strip" aria-label="Metodología de aprendizaje"><div><b>01</b><strong>Explora</strong><span>Comprende el desafío</span></div><div><b>02</b><strong>Programa</strong><span>Diseña una solución</span></div><div><b>03</b><strong>Resuelve</strong><span>Prueba y ajusta</span></div><div><b>04</b><strong>Reflexiona</strong><span>Comprende el resultado</span></div></section>}

    <section className="institution-context mustakis-context-grid"><div><span className="eyebrow">{isMentor?'Grupo':'Tu programa'}</span><strong>{workspace.program_name}</strong><span>{workspace.site_name??'Sede asignada'} · {workspace.cohort_name}</span></div><div><span className="eyebrow">Fundación</span><strong>{org?.name??workspace.organization_name}</strong><span>{org?.programName??'Programa institucional'}</span></div><div><span className="eyebrow">Sede aliada</span><strong>{org?.partnerName??workspace.site_name??'Institución anfitriona'}</strong><span>{org?.partnerLabel??'Articulación local del programa'}</span></div><div className="institution-official-links"><span className="eyebrow">Información oficial</span>{org&&<><a href={org.websiteUrl} target="_blank" rel="noreferrer">Sitio de la Fundación<ExternalLink size={14}/></a><a href={org.programUrl} target="_blank" rel="noreferrer">Robótica Educativa<ExternalLink size={14}/></a>{org.partnerWebsiteUrl&&<a href={org.partnerWebsiteUrl} target="_blank" rel="noreferrer">Institución aliada<ExternalLink size={14}/></a>}</>}</div></section>

    <section className="workspace-learning mustakis-learning"><div className="section-heading"><div><span className="eyebrow">{isMentor?'Contenido del programa':'Tu ruta de aprendizaje'}</span><h2>Sesiones y desafíos</h2><p className="muted">{isMentor?'Revisa cada sesión en el laboratorio y publícala cuando corresponda trabajar ese contenido.':'Avanza según el contenido trabajado en tu taller. Las próximas sesiones se habilitan cuando corresponda.'}</p></div>{isMentor&&<Link className="button" to={workspaceMentorPath(workspace)}>Gestionar sesiones<ArrowRight size={16}/></Link>}</div>
      {notice&&<p className="form-message workspace-notice" role="status">{notice}</p>}
      {loading?<div className="workspace-state" role="status"><RefreshCw className="spin" size={20}/><div><strong>Comprobando disponibilidad</strong><p>No asumimos que una sesión está publicada hasta recibir la respuesta del servidor.</p></div></div>:error?<div className="workspace-state is-error" role="alert"><LockKeyhole size={20}/><div><strong>No pudimos comprobar los contenidos</strong><p>{error}</p><button className="text-link" onClick={()=>void load()}>Reintentar<RefreshCw size={15}/></button></div></div>:<div className="institution-sessions">{sessions.map(session=>{const state=releaseMap.get(session.id),released=Boolean(state?.released),implemented=session.interactive,visible=isMentor||released;const stateLabel=!implemented?'En preparación':released?'Publicada':'No publicada';return <article className={`institution-session ${released?'is-released':'is-locked'} ${isMentor?'is-mentor-card':''}`} key={session.id}><div className="mustakis-session-top"><span className="session-ref">S{String(session.number).padStart(2,'0')}</span>{isMustakis&&<span className="mustakis-session-dot" aria-hidden="true"/>}</div><div className={`session-state ${!implemented?'is-preparing':''}`}>{!implemented?<RefreshCw size={15}/>:released?<Check size={15}/>:<LockKeyhole size={15}/>}<span>{isMentor?stateLabel:(released?'Disponible':'Próximamente')}</span></div>{visible?<><h3>{session.title}</h3><p>{session.summary}</p>{session.concepts.length>0&&<div className="session-skills">{session.concepts.slice(0,3).map(item=><span key={item}>{item}</span>)}</div>}{isMentor&&implemented?<div className="mentor-card-actions"><button className="text-link" disabled={updating===session.id} onClick={()=>void quickRelease(session.id,!released)}>{released?<EyeOff size={15}/>:<Eye size={15}/>} {updating===session.id?'Guardando…':released?'Ocultar a alumnos':'Publicar para alumnos'}</button><Link className="text-link" to={workspaceSessionPath(workspace,session.id)}>Abrir laboratorio<ArrowRight size={15}/></Link></div>:implemented?<Link className="text-link" to={workspaceSessionPath(workspace,session.id)}>Abrir laboratorio<ArrowRight size={16}/></Link>:<span className="muted small">El laboratorio de esta sesión todavía está en preparación.</span>}</>:<><h3>Sesión {String(session.number).padStart(2,'0')}</h3><p className="session-lock-copy">El contenido aparecerá aquí cuando corresponda verlo en tu taller.</p></>}</article>;})}</div>}
    </section>

    {isMustakis&&org?.heroImageUrl&&<section className="mustakis-community"><figure><img src={org.heroImageUrl} alt={org.heroImageAlt??'Comunidad de Ciencia y Tecnología.'}/></figure><div><span className="eyebrow">Comunidad de Ciencia y Tecnología</span><h2>Aprendizaje que continúa fuera del taller.</h2><p>{org.spotlightBody??'BITIRO acompaña el trabajo presencial con un espacio de práctica autónoma para reforzar programación y robótica educativa.'}</p></div></section>}

    {isMustakis&&<footer className="mustakis-institutional-footer"><div className="mustakis-footer-copy"><span className="eyebrow">Fundación Mustakis · Ciencia y Tecnología</span><strong>Robótica Educativa</strong><p>BITIRO Lab acompaña la práctica del programa como plataforma de simulación y aprendizaje.</p></div><div className="mustakis-footer-actions">{org&&<><a href={org.websiteUrl} target="_blank" rel="noreferrer">Fundación Mustakis<ArrowUpRight size={15}/></a><a href={org.programUrl} target="_blank" rel="noreferrer">Robótica Educativa<ArrowUpRight size={15}/></a></>}</div><div className="mustakis-footer-signature"><span>Plataforma</span><strong>BITIRO Lab</strong></div></footer>}
  </main>;
}

export function MentorWorkspacePage({workspace}:{workspace:WorkspaceSummary}){
  const service=useWorkspaces(),org=organizationPresentations[workspace.organization_id];
  const [access,setAccess]=useState<WorkspaceSessionAccess[]>([]),[overview,setOverview]=useState<MentorWorkspaceOverview|null>(null),[participants,setParticipants]=useState<WorkspaceParticipant[]>([]),[learning,setLearning]=useState<CohortLearningRow[]>([]),[invite,setInvite]=useState<ParticipantInvite|null>(null);
  const [busy,setBusy]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [maxUses,setMaxUses]=useState(40),[validDays,setValidDays]=useState(14),[copied,setCopied]=useState(false);
  async function load(){
    setLoading(true);setError('');
    try{
      const [sessionAccess,summary,currentInvite,currentParticipants,currentLearning]=await Promise.all([
        service.loadSessionAccess(workspace),
        service.loadMentorOverview(workspace),
        service.loadParticipantInvite(workspace),
        service.loadParticipants(workspace),
        service.loadCohortLearning(workspace)
      ]);
      setAccess(sessionAccess);setOverview(summary);setInvite(currentInvite);setParticipants(currentParticipants);setLearning(currentLearning);
    }catch(e){setAccess([]);setOverview(null);setInvite(null);setParticipants([]);setLearning([]);setError(e instanceof Error?e.message:'No pudimos cargar el grupo.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[workspace.cohort_id]);
  const map=useMemo(()=>new Map(access.map(item=>[item.session_id,item])),[access]);
  const publishedInteractive=sessions.filter(session=>session.interactive&&Boolean(map.get(session.id)?.released)).length;
  async function toggle(sessionId:string,released:boolean){if(loading)return;setBusy(sessionId);setError('');setMessage('');try{await service.setSessionRelease(workspace,sessionId,released);await load();setMessage(released?'Práctica publicada para los participantes.':'Práctica ocultada para los participantes.');}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el cambio.');}finally{setBusy('');}}
  async function createInvite(){setBusy('invite');setError('');setMessage('');setCopied(false);try{const created=await service.createParticipantInvite(workspace,maxUses,validDays);setInvite(created);setMessage('Código de participantes creado. Compártelo solo con este grupo.');}catch(e){setError(e instanceof Error?e.message:'No pudimos crear el código.');}finally{setBusy('');}}
  async function revokeInvite(){setBusy('invite');setError('');setMessage('');setCopied(false);try{await service.revokeParticipantInvite(workspace);setInvite(null);setMessage('Código revocado. Ya no puede usarse para nuevas incorporaciones.');}catch(e){setError(e instanceof Error?e.message:'No pudimos revocar el código.');}finally{setBusy('');}}
  async function copyInvite(){if(!invite)return;try{await navigator.clipboard.writeText(invite.code);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}catch{setError('No pudimos copiar el código automáticamente. Puedes seleccionarlo y copiarlo manualmente.');}}
  const learningByParticipant=useMemo(()=>{
    const map=new Map<string,{visited:number;attempted:number;completed:number}>();
    for(const row of learning){const entry=map.get(row.user_id)??{visited:0,attempted:0,completed:0};
      if(row.status==='completed')entry.completed++;else if(row.status==='attempted')entry.attempted++;else entry.visited++;map.set(row.user_id,entry);}
    return map;
  },[learning]);
  const inviteDate=invite?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(invite.expires_at)):'';
  return <main id="main" className={`content-page mentor-page ${org?.theme==='mustakis'?'theme-mustakis':''}`}><Link className="text-link" to={workspacePath(workspace)}>Volver al espacio<ArrowRight size={16}/></Link><header className="page-heading mentor-heading"><span className="eyebrow">Panel de mentor · {workspace.site_name??workspace.organization_name}</span><h1>{workspace.cohort_name}</h1><p>Administra el acceso de participantes y decide qué prácticas están visibles para este grupo.</p></header>
    <section className="mentor-kpis" aria-label="Resumen del grupo"><div><Users size={20}/><span>Participantes</span><strong>{loading?'—':overview?.participant_count??0}</strong></div><div><UserRound size={20}/><span>Mentores</span><strong>{loading?'—':overview?.mentor_count??0}</strong></div><div><Layers3 size={20}/><span>Publicadas</span><strong>{loading?'—':publishedInteractive}</strong></div></section>
    {message&&<p className="form-message" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}

    <section className="mentor-access-section" aria-labelledby="mentor-access-title"><div className="section-heading"><div><span className="eyebrow">Acceso del grupo</span><h2 id="mentor-access-title">Invita participantes.</h2><p className="muted">Cada alumno crea primero su cuenta BITIRO. Luego usa este código una sola vez para quedar asociado a este grupo como participante.</p></div><button className="button" type="button" disabled={loading||busy==='refresh'} onClick={()=>{setBusy('refresh');void load().finally(()=>setBusy(''));}}><RefreshCw size={16}/>Actualizar</button></div>
      <div className="mentor-access-grid"><div className="mentor-invite-card"><div className="mentor-invite-heading"><UserPlus size={21}/><div><strong>Código de participantes</strong><span>Solo permite entrar como participante a {workspace.cohort_name}.</span></div></div>{loading?<div className="mentor-summary-loading"><RefreshCw className="spin" size={17}/>Comprobando código…</div>:invite?<><div className="mentor-code-row"><code aria-label="Código de participantes">{invite.code}</code><button className="button compact" type="button" onClick={()=>void copyInvite()}><Copy size={15}/>{copied?'Copiado':'Copiar'}</button></div><div className="mentor-invite-meta"><span>{invite.max_uses===null?`${invite.uses} usos`:`${invite.uses} de ${invite.max_uses} usos`}</span><span>Vence {inviteDate}</span><span>{invite.remaining_uses===null?'Sin límite de cupos':`${invite.remaining_uses} cupos disponibles`}</span></div><div className="button-row"><button className="button" type="button" disabled={busy==='invite'} onClick={()=>void createInvite()}><RefreshCw size={15}/>{busy==='invite'?'Procesando…':'Generar uno nuevo'}</button><button className="button danger-quiet" type="button" disabled={busy==='invite'} onClick={()=>void revokeInvite()}><Ban size={15}/>Revocar</button></div></>:<><div className="mentor-invite-options"><label className="form-field">Cupos<input type="number" min={1} max={200} value={maxUses} onChange={event=>setMaxUses(Number(event.target.value))}/></label><label className="form-field">Vigencia (días)<input type="number" min={1} max={60} value={validDays} onChange={event=>setValidDays(Number(event.target.value))}/></label></div><button className="primary" type="button" disabled={busy==='invite'||maxUses<1||maxUses>200||validDays<1||validDays>60} onClick={()=>void createInvite()}><KeyRound size={16}/>{busy==='invite'?'Creando…':'Crear código del grupo'}</button></>}</div>
        <div className="mentor-participant-card"><div className="mentor-invite-heading"><UsersRound size={21}/><div><strong>Participantes vinculados</strong><span>Solo mostramos integrantes activos de este grupo.</span></div></div>{loading?<div className="mentor-summary-loading"><RefreshCw className="spin" size={17}/>Cargando participantes…</div>:participants.length===0?<div className="mentor-empty-list"><UsersRound size={22}/><strong>Aún no hay participantes.</strong><span>Cuando usen el código del grupo aparecerán aquí.</span></div>:<ul className="mentor-participant-list">{participants.map(item=><li key={item.user_id}><span className="participant-avatar" aria-hidden="true">{item.display_name.trim().slice(0,1).toUpperCase()}</span><div><strong>{item.display_name}</strong><span>Se unió {new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(item.joined_at))}</span><span>Prácticas: {learningByParticipant.get(item.user_id)?.visited??0} visitadas · {learningByParticipant.get(item.user_id)?.attempted??0} intentadas · {learningByParticipant.get(item.user_id)?.completed??0} superadas en simulador (autoevaluación)</span></div></li>)}</ul>}</div></div>
    </section>

    <section className="mentor-release-section"><div className="section-heading"><div><span className="eyebrow">Contenido del programa</span><h2>Sesiones y laboratorios.</h2><p className="muted">Revisa el contenido y publica cada sesión cuando corresponda trabajarla con el grupo.</p></div></div>{loading?<div className="workspace-state" role="status"><RefreshCw className="spin" size={20}/><div><strong>Cargando permisos del grupo…</strong><p>Las acciones permanecen bloqueadas hasta conocer el estado real.</p></div></div>:<div className="release-list">{sessions.map(session=>{const released=Boolean(map.get(session.id)?.released),implemented=session.interactive;return <div className="release-row" key={session.id}><span className="session-ref">S{String(session.number).padStart(2,'0')}</span><div><strong>{session.title}</strong><span>{implemented?'Laboratorio interactivo disponible':'Laboratorio en preparación'}</span></div><div className="release-action">{implemented?<button className={`release-button ${released?'is-published':''}`} aria-label={`${released?'Ocultar':'Publicar'} S${String(session.number).padStart(2,'0')}: ${session.title}`} disabled={busy===session.id||!workspace.can_manage} onClick={()=>void toggle(session.id,!released)}>{released?<EyeOff size={16}/>:<Eye size={16}/>}<span>{busy===session.id?'Guardando…':released?'Publicada · ocultar':'No publicada · publicar'}</span></button>:<span className="release-pending"><LockKeyhole size={15}/>En preparación</span>}</div></div>;})}</div>}</section>
    <aside className="mentor-security-note"><ShieldCheck size={20}/><div><strong>El código y las publicaciones son reglas de acceso.</strong><p>El código solo agrega participantes a esta cohorte. Las prácticas siguen protegidas por membresía y publicación; no basta con conocer una URL.</p></div></aside></main>;
}

export function LockedInstitutionSession({workspace,sessionId}:{workspace:WorkspaceSummary;sessionId:string}){
  return <main id="main" className="locked-session"><LockKeyhole size={31}/><span className="eyebrow">{workspace.organization_name}</span><h1>Esta sesión todavía no está publicada para tu grupo.</h1><p>Tu mentor la publicará cuando corresponda practicar el contenido visto en clase.</p><Link className="primary" to={workspacePath(workspace)}>Volver a mi espacio<ArrowRight size={16}/></Link><small>Referencia: {sessionId.toUpperCase()}</small></main>;
}
