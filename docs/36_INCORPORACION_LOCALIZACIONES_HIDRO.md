# Incorporación de referencias hidroeléctricas · 2.23.0

18/11/2026. Se incorporan las nueve coordenadas verificadas en PLAHE descritas en [la auditoría previa](35_LOCALIZACIONES_HIDROELECTRICAS_VERIFICADAS.md).

`data/localizaciones_hidroelectricas.json` conserva los IDs estables, coordenadas completas, nombres PLAHE, potencias contrastadas, fechas de consulta, enlaces de ficha y hashes de las evidencias. `scripts/aplicar_localizaciones_hidro.py` aplica la tabla al GeoJSON, metadatos y catálogo de fuentes. El importador del Excel auditado llama la misma función, de modo que la regeneración preserva la localización.

Cada registro incorpora `referencia_localizacion`, `fuente_localizacion_id`, `url_localizacion`, `precision_localizacion` y `fecha_verificacion_localizacion`. La referencia visible es «Punto de referencia del aprovechamiento (PLAHE); no necesariamente el edificio de la central». Se muestra en la información de los puntos de los módulos 01 y 04, en sus fichas y en el aviso permanente del mapa productivo del módulo 01. El exportador productivo incluye la referencia y la fuente.

No se modifican potencias, departamentos, coeficientes, calendarios o resultados analíticos. La ficha de Frontera II declara dos departamentos; su punto cae en Languiñeo y conserva la asignación vigente.

## Cobertura

- Inventario: 89 registros localizados sobre 92; las 11 hidroeléctricas (2 existentes y 9 proyectadas) tienen puntos.
- Escenario Intensivo: 18 proyectos localizados sobre 19; falta Aluar Etapa II.
- Cartera completa: faltan El Escorial y Aluar Etapa II. La Flecha operativa también conserva su localización vacía.

## Verificación

`python scripts/validar_localizaciones_hidro.py` comprueba las nueve referencias, cobertura, regeneración e idempotencia. Con el argumento de la copia previa también comprueba que sólo cambien las nueve geometrías y los campos de localización autorizados. Se contrastó cada punto con su polígono departamental.

Validadores de escenarios futuros, comparador, proyectos y coordinación productiva aprobados. Navegador local: nueve marcadores hidroeléctricos visibles en la accesibilidad del escenario Intensivo; mapa y aviso permanente revisados visualmente; ficha de Frontera II muestra referencia, precisión no informada y enlace de localización PLAHE. Sin errores de consola observados.
