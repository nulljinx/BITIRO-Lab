# BITIRO Lab v7.18 — Calibración espacial y retorno automático

## Cambios
- Las lecturas de línea ya no son idénticas en toda la pista: se simulan pequeñas variaciones espaciales de papel, impresión y luz de forma determinista.
- El mismo punto mantiene la misma referencia; no se añadió ruido aleatorio por cuadro.
- En modo calibración se muestran tres zonas pedagógicas (superior, media e inferior) para incentivar muestras en distintos lugares.
- El panel indica cuántas zonas se exploraron y explica por qué conviene medir en más de un punto.
- Al guardar correctamente la calibración, BITIRO sale automáticamente del modo de calibración, reinicia el IROH, vuelve a Vista 3D y muestra una confirmación temporal con los umbrales aplicados.
- Se ajustaron pruebas para validar la variación espacial estable.
