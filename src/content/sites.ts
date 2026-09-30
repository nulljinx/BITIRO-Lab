/** Public reference directory, verified 2026-09-17 against Mustakis FAQ (2026-02-17).
 * Choosing a site in BITIRO does not register or admit anyone to an official workshop.
 * Stable text IDs must match the database seed. No participant data belongs here.
 */
export type Site = { id:string; name:string; city:string; region:string; partner:string };
export const initialSites:Site[] = [
  {id:'valparaiso',name:'Valparaíso · Casa Central',city:'Valparaíso',region:'Valparaíso',partner:'Universidad Técnica Federico Santa María'},
  {id:'recoleta',name:'Recoleta',city:'Recoleta',region:'Metropolitana de Santiago',partner:'Fundación Mustakis'},
  {id:'rancagua',name:'Rancagua',city:'Rancagua',region:'Libertador General Bernardo O’Higgins',partner:'Universidad de O’Higgins'},
  {id:'curico',name:'Curicó',city:'Curicó',region:'Maule',partner:'Universidad de Talca'},
  {id:'talca',name:'Talca',city:'Talca',region:'Maule',partner:'Universidad de Talca'},
  {id:'concepcion',name:'Concepción · Hualpén',city:'Hualpén',region:'Biobío',partner:'Universidad Técnica Federico Santa María'},
  {id:'temuco',name:'Temuco',city:'Temuco',region:'La Araucanía',partner:'Universidad de La Frontera'},
  {id:'puerto-montt',name:'Puerto Montt',city:'Puerto Montt',region:'Los Lagos',partner:'Universidad Austral de Chile'},
];
