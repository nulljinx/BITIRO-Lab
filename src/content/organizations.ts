export interface OrganizationPresentation {
  id:string;
  name:string;
  shortName:string;
  programName:string;
  description:string;
  websiteUrl:string;
  programUrl:string;
  theme:'mustakis';
  experienceLabel:string;
  tagline:string;
  programDescription:string;
  logoUrl?:string;
  partnerName?:string;
  partnerLabel?:string;
  partnerLogoUrl?:string;
  partnerWebsiteUrl?:string;
  heroImageUrl?:string;
  heroImageAlt?:string;
  spotlightTitle?:string;
  spotlightBody?:string;
}

/** Public presentation metadata only. Membership and access are resolved by the backend. */
export const organizationPresentations:Record<string,OrganizationPresentation>={
  mustakis:{
    id:'mustakis',
    name:'Fundación Mustakis',
    shortName:'Mustakis',
    programName:'Ciencia y Tecnología · Robótica Educativa',
    description:'BITIRO Lab acompaña el aprendizaje de programación y robótica del programa de Fundación Mustakis.',
    websiteUrl:'https://www.fundacionmustakis.org/',
    programUrl:'https://robotica.fundacionmustakis.org/',
    theme:'mustakis',
    experienceLabel:'BITIRO Lab · Fundación Mustakis',
    tagline:'Descubre tu potencial',
    programDescription:'Comprende el desafío, programa el IROH, prueba tu solución y vuelve a intentarlo. BITIRO Lab acompaña el contenido de cada sesión del programa de Robótica Educativa.',
    logoUrl:'/brand/mustakis/mustakis-logo.webp',
    partnerName:'Talca Universidad Chile',
    partnerLabel:'Sede aliada · Talca',
    partnerLogoUrl:'/brand/mustakis/talca-logo.png',
    heroImageUrl:'/brand/mustakis/cyt-talca-group.jpg',
    heroImageAlt:'Participantes de una actividad del programa de Ciencia y Tecnología reunidos al aire libre en la sede de Talca.',
    spotlightTitle:'Comunidad de Ciencia y Tecnología',
    spotlightBody:'BITIRO Lab extiende la práctica de cada sesión con simulación, programación del IROH, desafíos y contenidos de apoyo para reforzar lo aprendido.',
  },
};
