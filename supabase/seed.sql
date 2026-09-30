-- Production-safe initial educational catalog. No privileged demo codes are created here.
-- BITIRO is an independent platform; institutional branding/content requires operator authorization.
insert into public.organizations(id,name) values
 ('mustakis','Programa de Robótica Educativa · Fundación Mustakis')
on conflict(id) do nothing;

insert into public.sites(id,organization_id,name,city,region,partner,sort_order) values
 ('valparaiso','mustakis','Valparaíso · Casa Central','Valparaíso','Valparaíso','Universidad Técnica Federico Santa María',1),
 ('recoleta','mustakis','Recoleta','Recoleta','Metropolitana','Fundación Mustakis',2),
 ('rancagua','mustakis','Rancagua','Rancagua','O’Higgins','Universidad de O’Higgins',3),
 ('curico','mustakis','Curicó','Curicó','Maule','Universidad de Talca',4),
 ('talca','mustakis','Talca','Talca','Maule','Universidad de Talca',5),
 ('concepcion','mustakis','Concepción · Hualpén','Hualpén','Biobío','Universidad Técnica Federico Santa María',6),
 ('temuco','mustakis','Temuco','Temuco','La Araucanía','Universidad de La Frontera',7),
 ('puerto-montt','mustakis','Puerto Montt','Puerto Montt','Los Lagos','Universidad Austral de Chile',8)
on conflict(id) do nothing;

update public.organizations set
 short_name='Fundación Mustakis',
 description='Espacio de práctica para acompañar el aprendizaje de programación y robótica del programa Ciencia y Tecnología.',
 website_url='https://www.fundacionmustakis.org/',
 program_url='https://robotica.fundacionmustakis.org/',
 theme_key='mustakis'
where id='mustakis';

insert into public.programs(id,organization_id,name,level,description,sort_order) values
 ('mustakis-robotica-intermedia','mustakis','Robótica Intermedia','intermedio','Práctica complementaria del programa de Robótica Educativa.',1)
on conflict(id) do nothing;
