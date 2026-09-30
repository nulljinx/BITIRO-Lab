# BITIRO Lab: referencias y decisiones de diseño

Consulta de fuentes: 17 de septiembre de 2026. Estas referencias orientan decisiones de interacción; no autorizan ni implican copiar marcas, imágenes, pantallas o afiliaciones.

## Dirección propia

BITIRO es una marca independiente. El laboratorio y la ruta de aprendizaje son el centro: papel cálido para leer, tinta para programar y cobre para actuar. Evitar paneles administrativos como entrada al producto, métricas ficticias, tarjetas repetidas sin propósito y promesas de simulaciones aún no implementadas. Conservar el logotipo existente; no incorporar identidades de proveedores ni universidades como decoración.

La navegación principal conduce a Laboratorio, Recursos, Sedes y Cuenta. En una misión, la prioridad es código, pista, sensores y una acción de ejecución clara. Las funciones de gestión aparecen solo cuando corresponden al rol efectivo.

## Referencias aplicadas

| Referencia oficial | Principio adoptado en BITIRO |
| --- | --- |
| [Carbon: formularios](https://carbondesignsystem.com/patterns/forms-pattern/) | Etiquetas persistentes, campos estrictamente necesarios, orden predecible, ayuda junto al dato y compatibilidad con gestores de contraseñas. |
| [Carbon: estados vacíos](https://carbondesignsystem.com/patterns/empty-states-pattern/) | Explicar la situación y ofrecer el siguiente paso. Distinguir sin datos, sin permisos, carga y error. No sustituir datos reales por ejemplos que parezcan personas reales. |
| [Atlassian: tokens](https://atlassian.design/foundations/tokens/) | Nombrar valores por su función y mantener un contrato de tokens para que estados y componentes evolucionen de forma consistente. |
| [Wokwi: introducción](https://docs.wokwi.com/) | Acortar la distancia entre editar y observar. La práctica virtual permite repetir ensayos; no implica que BITIRO implemente el hardware o la compatibilidad de Wokwi. |

## Contrato visual y accesible

Los tokens de texto sobre acciones y texto sobre superficies oscuras deben estar separados. El naranja anterior con texto blanco tenía contraste insuficiente. Usar cobre oscuro con blanco, o cobre luminoso con tinta; medir todas las combinaciones finales y sus estados. Texto normal: mínimo 4,5:1; texto grande: 3:1 según [WCAG 2.2, contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Colores por sí solos no comunican errores o estados.

Texto de lectura a 14–16 px como decisión de diseño; etiquetas técnicas legibles, preferentemente 11–12 px. La norma no impone ese tamaño de fuente. Favorecer controles táctiles de 44 px; el criterio AA de [tamaño mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) establece 24 px o sus excepciones. Conservar foco visible y comprobar teclado, 320 px, zoom y movimiento reducido. El contenido no puede depender de una animación para hacerse visible.

En tablet, código y simulación son vistas alternables; en móvil forman un flujo vertical y los datos del robot siguen disponibles mediante un panel accesible. Calibración presenta instrucciones, lectura actual, tabla de tres sensores y guardado sin superposiciones. Los umbrales guardados son referencias de medición: el estudiante los aplica a su programa.

## Directorio inicial de sedes

Fuente: [Preguntas frecuentes de postulación 2026, Fundación Mustakis](https://www.fundacionmustakis.org/wp-content/uploads/2026/02/Preguntas-frecuentes-Postulacion-2026.pdf), revisión del 17 de febrero de 2026, página 5. El directorio incluye Valparaíso, Recoleta, Rancagua, Curicó, Talca, Concepción/Hualpén, Temuco y Puerto Montt. El archivo `src/content/sites.ts` contiene nombres y entidades asociadas; sus identificadores de texto coinciden con la base de datos.

La ubicación de la sede Concepción es Hualpén. Se usa Recoleta, evitando arrastrar una asociación antigua de Santiago que no aparece en esa lista. Elegir una sede en BITIRO organiza una cuenta de práctica: no postula al programa, acredita participación, concede un cupo ni certifica aprobación. No copiar al registro BITIRO la documentación personal solicitada por un proceso institucional distinto.

## Verificación antes de publicación

- Contraste, navegación por teclado y foco tras errores, diálogos y cambios de ruta.
- Registro y recuperación con respuestas genéricas, envío pendiente visible y alternativa de práctica libre.
- Mismo significado de estado en ruta, CTA y cuenta; explorar una sesión no equivale a aprobarla.
- S01 y S02 se presentan como simulaciones interactivas. S03–S08 permanecen como material/editor mientras no exista su motor validado.
- Sin personas de demostración, credenciales ficticias ni estadísticas inventadas en páginas de gestión.
