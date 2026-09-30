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
    description:'Espacio de práctica para acompañar el aprendizaje de programación y robótica del programa Ciencia y Tecnología.',
    websiteUrl:'https://www.fundacionmustakis.org/',
    programUrl:'https://robotica.fundacionmustakis.org/',
    theme:'mustakis',
    experienceLabel:'Experiencia Mustakis × BITIRO',
    tagline:'Descubre tu potencial',
    programDescription:'Programa, experimenta y vuelve a intentarlo. Este espacio acompaña el taller presencial con práctica autónoma, desafíos del IROH y seguimiento del trabajo del grupo.',
    logoUrl:'/brand/mustakis/mustakis-logo.webp',
    partnerName:'Talca Universidad Chile',
    partnerLabel:'Sede aliada · Talca',
    partnerLogoUrl:'/brand/mustakis/talca-logo.png',
    heroImageUrl:'/brand/mustakis/cyt-talca-group.jpg',
    heroImageAlt:'Participantes de una actividad del programa de Ciencia y Tecnología reunidos al aire libre en la sede de Talca.',
    spotlightTitle:'Comunidad de Ciencia y Tecnología',
    spotlightBody:'La experiencia combina talleres presenciales, desafíos de robótica educativa y práctica autónoma en BITIRO para reforzar lo aprendido en cada sesión.',
  },
};
