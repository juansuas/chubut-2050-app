# Chubut 2050 V2

## Numeración de capas y módulos

Convención vigente desde el 17/11/2026: capa y módulo utilizan el mismo número, según el orden de navegación de la app.

| Capa / módulo | Nombre en navegación | Ruta |
| --- | --- | --- |
| 01 | Escenarios de futuro | `#escenarios` |
| 02 | Demografía | `#demografia` |
| 03 | Educación (Oferta y capacidad) | `#oferta` |
| 04 | Producción y energía | `#productivos` |
| 05 | Comparador | `#comparador` |

El módulo 01 reemplaza al antiguo Resumen provincial. Desde 2.21.0 se recupera el módulo 05 como comparador independiente; `#resumen` redirige a `#escenarios` y `#comparador` abre el módulo 05. El módulo 01 presenta los escenarios prefijados Moderado, Intensivo y Total frente al tendencial fijo. Productivos (04) conserva su escenario editable independiente.

La denominación anterior «capa 3» para Productivos queda reemplazada por «capa / módulo 04». Educación corresponde a la capa / módulo 03. Los nombres de archivos históricos que contienen `CAPA_3` se conservan como identificadores de archivo, no como numeración vigente. Los números iniciales de los documentos (21, 22, etc.) son su orden documental y no identifican módulos.

Aplicación web estática con cinco módulos activos: `Escenarios de futuro`, `Demografía`, `Oferta y capacidad`, `Producción y energía` y `Comparador`.

## Interfaz productiva · capa 04

La capa 04 reúne un contexto territorial y temporal, el mapa junto al editor y una zona de resultados con pestañas. Los detalles de organización y verificación están en [27_INTERFAZ_CAPA_04.md](docs/27_INTERFAZ_CAPA_04.md).

El territorio de Productivos utiliza `scenarioPopulationDepartment` y no modifica el territorio de Demografía o Educación. Cambiar de departamento o filtrar la cartera conserva todos los proyectos del escenario. Los resultados muestran el territorio seleccionado; los parámetros continúan siendo globales para el escenario. «Limpiar filtros» sólo restablece los filtros del inventario; «Vaciar escenario» elimina la selección de proyectos y conserva los parámetros.

Para validar el modelo y la coordinación de interfaz desde esta carpeta:

```powershell
node scripts/validar_escenario_proyectos.mjs
node scripts/validar_interfaz_productiva.mjs
```

## Fuentes

- Población departamental 2022–2050 por edad simple y sexo: serie ajustada por Santiago Linares para el proyecto, tomando como referencia las proyecciones jurisdiccionales de INDEC. La apertura departamental no es una publicación oficial de INDEC. En 2028 y 2029 conserva diferencias menores frente al control provincial (máximo: 24 personas en el total y 146 por sexo).
- Tasas de asistencia 2022 por departamento, jurisdicción, grupo de edad y sexo: GeoJSON de INDEC/Censo 2022.
- Asistencia a nivel secundario a los 18 años: INDEC, Censo 2022, cuadro 2.5 y cuadros departamentales 2.5.1–2.5.15.
- Matrícula y secciones: `Escuelas Tecnicas con matricula.xlsx`, hoja `Base`, modalidad Común, oferta activa, año 2024.
- Umbrales: `Planificacion_Capacidad_Ociosidad_Brechas_ETP_Chubut.xlsx`, hoja `Metodología`, celda A3.
- Instalaciones energéticas: capas WFS del Sistema Provincial de Información Ambiental de Chubut para parques eólicos y conjunto de centrales de la Secretaría de Energía de la Nación para capacidad, agentes y centrales hidroeléctricas/térmicas. La fecha de actualización declarada de la fuente nacional es 2023-09-03; SPIA no informa fecha de corte.

Las fuentes originales permanecen en `V2/02_Datos/00_Fuentes`. El script de construcción genera tablas canónicas separadas y copias livianas de publicación para la app.

La fuente activa de población se incorpora con `adoptar_proyeccion_linares.py`. El script valida las 29 hojas anuales, la cobertura de 15 departamentos, 101 edades, ambos sexos, claves únicas y la identidad Mujeres + Varones = Total. Conserva una copia sin transformación del XLSX, archiva la serie departamental anterior y publica la misma tabla canónica tanto para Demografía como para los cálculos educativos. Por eso los gráficos demográficos y la demanda potencial se actualizan a partir de una única fuente, sin sobrescribir las tasas ni la matrícula observada.

## Capa productivo-energética

La versión 2.14 usa «Capa construida» del inventario auditado el 09/11/2026. Para regenerar los archivos que consume la app, ejecutar `python scripts/importar_inventario_auditado.py ruta/al/inventario.xlsx` desde la carpeta de la app con `openpyxl` disponible. Los scripts de publicación anteriores reconstruyen la capa anterior a esta auditoría; no deben usarse para publicar este inventario.

| Energía | Capacidad operativa conocida (MW) | Proyectos | Potencia declarada (MW) | Potencia simulable (MW) |
|---|---:|---:|---:|---:|
| Eólica | 1.650,910 | 13 | 1.242,600 | 1.242,600 |
| Hidroeléctrica | 606,800 | 9 | 392,570 | 392,570 |
| Térmica | 434,835 | 0 | 0 | 0 |

La capacidad eólica combina el corte CAMMESA de septiembre (1.314,91 MW) con La Flecha, etapa V de Aluar (+336 MW). La capacidad hidroeléctrica se conserva según el registro 2023, con estado contrastado con la base de generadores de CAMMESA. El piso térmico confirmado es parcial: incluye 57,735 MW de autogeneración no firme (MBE2). Las térmicas sin estado confirmado conservan su potencia histórica en la ficha. No se crean puntos en el mapa para registros sin coordenadas.

Los valores cargados en la columna de instalada para filas proyectadas se tratan como potencia de proyecto. Se excluyen del consolidado las filas duplicadas de El Tordillo y Manantiales Behr II. El equipo confirmó el 17/11/2026 la adopción de 80 MW de PLAHE para Frontera II y la independencia de Aluar Etapa II como ampliación futura de 96 MW. Los 22 proyectos quedan habilitados, por 1.635,17 MW.

En «Puesta en funcionamiento de proyectos», el usuario marca uno o más proyectos y asigna a cada uno un año entre 2026 y 2050. La capacidad completa entra a su departamento desde ese año; el registro observado no cambia. El estado se guarda en el navegador. Los antiguos cambios manuales no equivalen a proyectos identificables y no se trasladan al escenario nuevo.

El simulador usa los valores centrales precisos del informe metodológico del 17/11/2026. La proporción de puestos migrantes es 31 %, 32,5 %, 27,8 % y 29 % según tecnología. Sobre ella se aplica una proporción extraprovincial global editable entre 0 y 100 %, inicialmente 100 %. Confluencia es el único perfil activo. El contrato vigente está en V2/01_Documentacion/21_CONTRATO_DATOS_CAPA_PRODUCTIVA.md.

### Perfiles migratorios y demanda educativa

La demanda educativa usa exclusivamente el perfil de Confluencia. Los cuadros de migraciones del Censo 2022 cuentan residentes de cinco años o más en viviendas particulares que vivían en otra provincia o país en 2017. Para convertir los grupos quinquenales en edades simples se usan, dentro de cada sexo, las proporciones observadas en los cuadros censales de educación. Para las edades 0 a 4, se multiplica el recuento migrante de 5 a 9 por la razón censal entre la población de cada edad de 0 a 4 y el total de 5 a 9 del mismo sexo y territorio. La variación de ±25 % sobre esa imputación es una prueba de sensibilidad.

Las cohortes envejecen según el año de inicio de la fase. La radicación temporal de obra termina cuando empieza la operación. Los resultados usan las tasas censales de asistencia del departamento de destino, con respaldo provincial cuando corresponde. Las edades de 18 años muestran asistencia a Secundario y se presentan por separado. La prueba mantiene el volumen poblacional del simulador y no agrega nacimientos ni defunciones.

Para reproducir los perfiles, bajar los cuatro cuadros en una carpeta y ejecutar `python scripts/importar_perfiles_migrantes.py carpeta`. Los archivos originales necesarios se guardan con estos nombres:

- `neuquen-mig.xlsx` — [Migraciones de Neuquén, hoja 4.15.6 Confluencia](https://censo.gob.ar/wp-content/uploads/2024/01/c2022_neuquen_migraciones_c4_15.xlsx).
- `neuquen-edu.xlsx` — [Educación de Neuquén, hoja 1.15.6 Confluencia](https://censo.gob.ar/wp-content/uploads/2023/12/c2022_neuquen_educacion_c1_15.xlsx).

### Plan de acción y publicación

1. **Hecho:** normalizar la auditoría, generar identificadores estables, conciliar duplicados y separar capacidad instalada, histórica y proyectada.
2. **Hecho:** reemplazar MW manuales por selección de proyectos y año; incorporar el cálculo anual por departamento y los coeficientes de obra y O&M.
3. **Resuelto:** Frontera II adopta 80 MW de PLAHE y Aluar Etapa II conserva 96 MW como ampliación futura independiente, según confirmación del equipo.
4. **Alcance cerrado:** se supone contratación local dentro del propio departamento y adicionalidad del incremento extraprovincial sobre la base. Se conservan el envejecimiento y el volumen constante de las cohortes por fase. Se puede avanzar con interfaz y escenarios.

### Corrección local de 2040 y 2050

El XLSX entregado por Santiago Linares se conserva sin modificaciones. La publicación activa corrige únicamente las discontinuidades del perfil por edad detectadas en 2040 y 2050, manteniendo exactamente los totales originales de cada departamento y sexo.

- 2040: para cada departamento, edad simple y sexo se interpola el valor entre 2039 y 2041.
- 2050: para cada departamento, edad simple y sexo se extrapola desde 2049 mediante la mediana de las variaciones anuales observadas entre 2045 y 2049.
- Recalibración: los valores preliminares se reescalan al total original de cada combinación `Departamento × Sexo`; la asignación entera usa mayores restos.
- Alcance: los años 2022–2039 y 2041–2049 no se modifican.

La auditoría reproducible se guarda en `V2/02_Datos/04_Metadatos/auditoria_correccion_proyeccion_2040_2050.csv`, con valores originales, preliminares y corregidos. Esta corrección es una elaboración técnica del equipo del proyecto, no una revisión de la fuente original ni una proyección oficial de INDEC.

## Nivel y grupo de edad

| Nivel | Grupo visible | Secciones incluidas | Tasa aplicada |
| --- | --- | --- | --- |
| Inicial | 0–3 | Lactantes, Deambuladores, Sala de 2 y Sala de 3 | Asistencia 0–3 |
| Inicial | 4–5 | Sala de 4 y Sala de 5 | Asistencia 4–5 |
| Primario | 6–11 | 1.º a 6.º año/grado | Asistencia 6–11 |
| Secundario | 12–14 | 1.º a 3.º año | Asistencia 12–14 |
| Secundario | 15–17 | 4.º a 6.º año | Asistencia 15–17 |
| 18 años | 18 | 7.º año | Asistencia al nivel secundario a los 18 años |

La edad 18 es una categoría independiente: no se suma al seleccionar Secundario y dispone de su propio parámetro. No reutiliza la tasa ni el avance del grupo 15–17.

Los módulos Demografía y Oferta y capacidad comparten departamento, selector jerárquico Nivel / Grupo y sexo. Los niveles completos suman matrícula o población absoluta de sus grupos: Inicial = 0–3 + 4–5; Primario = 6–11; Secundario = 12–14 + 15–17. El selector de año reutiliza un único componente visual que se desplaza entre ambos módulos y conserva Play/Pause, pero mantiene estados temporales independientes: Demografía inicia en 2022 y usa 2022–2050; Oferta y capacidad inicia en 2024 y usa 2024–2050. Cambiar el año de un módulo no modifica el año guardado del otro.

Los controles de cada módulo se agrupan en un panel de escenario reutilizable. Por defecto permanece en el flujo de la página; la acción `Mantener visible` activa la flotación de forma optativa. En ese modo puede arrastrarse dentro de la ventana, minimizarse, volver a su posición original o cerrarse con `Escape`. En pantallas angostas funciona como panel inferior y no se arrastra. La implementación genérica se activa agregando `data-floating-panel`, `data-panel-module`, `data-panel-float-toggle`, `data-panel-minimize` y `data-panel-drag-handle`, de modo que los módulos futuros puedan reutilizarla sin duplicar listeners ni estado analítico.

## Capacidad modelada

La unidad operativa es la sección-grado-oferta 2024. Ante la ausencia de `id_seccion`, la clave sustituta combina año, CUE-anexo, nivel, turno, grado, nombre de sección, orientación y título. Esta apertura evita fusionar ofertas secundarias diferentes que reutilizan el mismo nombre de sección. La publicación web conserva únicamente las columnas consumidas por las visualizaciones; el canónico mantiene el detalle completo. Los umbrales son:

- Inicial: 18 estudiantes por sección.
- Primario: 22 estudiantes por sección.
- Secundario: 26 estudiantes por sección.

La interfaz permite modificar estos tres umbrales como parámetros del escenario. Los valores anteriores siguen siendo los predeterminados y se conserva `capacidad_base` en cada resultado derivado: la edición no sobrescribe la fuente ni cambia los cortes de color de ocupación (60%, 85% y 100%). El parámetro de Secundario también se aplica a la trayectoria independiente de 18 años.

Para cada sección, la ocupación observada de referencia se define en 2024:

```text
capacidad_modelada = umbral del nivel
ocupacion_base_2024 = matricula_observada_2024 / capacidad_modelada
holgura_base_2024 = max(0, capacidad_modelada - matricula_observada_2024)
sobreocupacion_base_2024 = max(0, matricula_observada_2024 - capacidad_modelada)
```

Las categorías preservan los cortes ya usados por la aplicación:

- menos de 60%: Capacidad disponible;
- 60% a menos de 85%: Equilibrio;
- 85% a 100%: Alta presión;
- más de 100%: Saturada.

La capacidad es un indicador modelado mediante umbrales. No representa aulas físicas, cargos ni vacantes administrativas observadas.

## Escenario y ancla 2024

Los datos se mantienen separados en cuatro capas: observados, parámetros, cálculos del escenario y agregaciones para las visualizaciones. Demografía y Oferta y capacidad consumen exactamente la misma serie departamental de población.

Para departamento, grupo, año y sexo:

```text
demanda_potencial_tendencial = poblacion_proyectada * tasa_asistencia_actual
demanda_potencial_escenario = poblacion_proyectada * tasa_asistencia_parametro
```

Estas magnitudes estiman demanda potencial, no matrícula administrativa. Para proyectar la presión sobre la oferta, la ocupación parte de la matrícula observada por sección en 2024 y aplica únicamente el factor de variación de esa demanda:

```text
factor_demanda_sexo = demanda_potencial_depto_grupo_sexo_año / demanda_potencial_depto_grupo_sexo_2024
carga_equivalente_seccion_sexo = matricula_observada_seccion_2024_sexo * factor_demanda_sexo
carga_equivalente_seccion = carga_equivalente_mujeres + carga_equivalente_varones
ocupacion_proyectada_seccion = carga_equivalente_seccion / capacidad_modelada_seccion
```

Con año 2024 y tasas de asistencia actuales, el factor es 1 y la carga equivalente reproduce la matrícula observada. Los factores de mujeres y varones se calculan por separado y luego se recomponen. La matrícula 2024 no reemplaza ni calibra el nivel de la demanda potencial: sólo fija la ocupación inicial de cada sección.

Cada slider expresa un avance relativo entre la tasa actual total del territorio seleccionado y 100%. Ese mismo avance se aplica a las tasas de mujeres y varones, preservando sus diferencias de partida.

El filtro de sexo utiliza matrícula observada, población y tasa del sexo seleccionado. Las secciones y su capacidad no se desagregan por sexo y permanecen constantes; la ocupación muestra la carga equivalente seleccionada respecto de esa capacidad total.

En el gráfico de evolución, la línea continua representa la demanda potencial tendencial (`Población proyectada × tasa actual`) y la punteada la demanda potencial bajo las tasas seleccionadas. La vista por nivel suma demandas absolutas de los grupos; no promedia tasas.

El dumbbell territorial compara en un único gráfico la tasa actual con la tasa del escenario para cada departamento y para cuatro series: Inicial, Primario, Secundario y 18 años. Los checks sólo controlan la visibilidad de las series; no modifican cálculos. Cada nivel publica una tasa equivalente ponderada por la población proyectada de sus grupos y sexos incluidos en el año activo: `Σ(Poblacion × Tasa) / Σ(Poblacion)`. Nunca usa un promedio simple. Un clic en un marcador sincroniza la selección territorial y recalibra los sliders sobre la tasa actual del departamento.

## Rendimiento de publicación

La app carga datos por módulo. Demografía no descarga la base de secciones hasta ingresar en Oferta y capacidad, y la base histórica `educacion_observada.csv` no se solicita en estos dos módulos. La publicación de población y secciones conserva sólo las columnas consumidas. Los índices de población/tasas, factores de escenario y proyecciones filtradas se reutilizan mediante caché; los cambios rápidos de estado se agrupan en un único render por cuadro de animación.

## Supuesto de distribución proporcional

La variación de la demanda potencial se distribuye proporcionalmente entre las secciones existentes del mismo departamento y grupo/nivel. No se trasladan estudiantes entre departamentos, niveles ni grupos, ni se anticipan aperturas o cierres de oferta. Es un supuesto analítico explícito y reemplazable posteriormente por un modelo de asignación territorial o accesibilidad.

La población y las tasas censales describen residencia. La matrícula administrativa se asigna al departamento donde está la escuela. Esta diferencia de referencia territorial se conserva y se informa; no se fuerza una identidad entre ambas bases.

## Fallback de tasas

La aplicación usa primero la tasa departamental del mismo grupo y sexo. Si no existe o el denominador es cero, usa la tasa provincial equivalente. En el material actual, el caso efectivo es mujeres de 18 años en Mártires, cuyo denominador departamental es cero.

## Construcción y validación

```powershell
& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\adoptar_proyeccion_linares.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\construir_modelo_capacidad_escenario.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\validar_modelo_capacidad_escenario.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\construir_base_productiva.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\validar_base_productiva.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\publicar_productivos_app_v2.py'

& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  '.\V2\02_Datos\05_Scripts\validar_app_v2_productivos.py'
```

Para abrir la app:

```powershell
& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  -m http.server 8125 --directory '.\V2\03_App'
```

## Escenarios de futuro · módulo 01

El módulo 01 prioriza demanda educativa potencial, compara los tres escenarios prefijados con un tendencial siempre visible y muestra la distribución por nivel, territorio y año. La selección se guarda por separado del escenario editable de Productivos. Los datos y controles de los módulos 02 y 03 se preservan.

Configuración: `data/escenarios_futuro.json`. Modelo de integración: `assets/js/future-model.js`, que reutiliza los cálculos productivos y de demanda educativa existentes. Documentación: [29_APP_ESCENARIOS_FUTURO.md](docs/29_APP_ESCENARIOS_FUTURO.md).

Validación: `node scripts/validar_escenarios_futuro.mjs`. Abrir `http://127.0.0.1:8125/#escenarios`.

### Tablero territorial del módulo 01 · 2.18.0

La reorganización con dos franjas temporales, hitos, puntos de centrales y comparación departamental se documenta en [30_MODULO_01_TABLERO_TERRITORIAL.md](docs/30_MODULO_01_TABLERO_TERRITORIAL.md). El año de lectura y el departamento sincronizan el tablero; las tasas se muestran como referencia del cálculo, sin modificar el módulo Educación.

### Comparación focalizada del módulo 01 · 2.19.0

Gráfico tendencial/escenario con switch Población total / Demanda educativa, selector de nivel, diferencia adicional e hitos verticales de obra y operación. Detalles en Territorios, Niveles educativos y Proyectos y supuestos. Véase [31_MODULO_01_COMPARACION_FOCALIZADA.md](docs/31_MODULO_01_COMPARACION_FOCALIZADA.md). Verificación adicional: `node scripts/validar_vista_futuro.mjs`. Implementación local.

### Relato infográfico del módulo 01 · 2.20.0

La página sigue la secuencia proyectos → empleo → población → demanda educativa por nivel, con textos dinámicos, mapa productivo departamental, calendario y cuatro trayectorias educativas siempre visibles. Reemplaza las pestañas como organización principal. Documentación: [32_MODULO_01_RELATO_INFOGRAFICO.md](docs/32_MODULO_01_RELATO_INFOGRAFICO.md). Entrega local.


### Comparador · módulo 05 · 2.21.0

Escenarios Tendencial, Moderado, Intensivo y Total seleccionables por lado. Año, territorio, capa y nivel educativo del mapa compartidos. Mapas sincronizados en vista y zoom, escalas comunes fijas y diferencias B−A en MW, población y demanda educativa. Validación: `node scripts/validar_comparador.mjs`. Documentación: [33_MODULO_05_COMPARADOR.md](docs/33_MODULO_05_COMPARADOR.md). Implementación local: `http://127.0.0.1:8125/#comparador`.


## Publicación en GitHub Pages

Versión 2.21.0 preparada el 18/11/2026. Sitio: https://juansuas.github.io/chubut-2050-app/ · [Módulo 1](https://juansuas.github.io/chubut-2050-app/#escenarios) · [Módulo 5](https://juansuas.github.io/chubut-2050-app/#comparador). Las menciones de entrega local en las secciones históricas describen el estado previo a esta publicación.

### Ajustes de lectura del módulo 01 · 2.22.0

Escenario punteado, rango vertical ampliable, gráfico educativo conjunto por nivel, selectores de escenario ampliados y mapas con segundo clic para quitar filtros. Proyectos georreferenciados sobre el mapa departamental y leyenda de hitos por marcadores. [Detalles y verificación](docs/34_MODULO_01_AJUSTES_LECTURA.md). Validación: `node scripts/validar_ajustes_modulo01.mjs`.

### Localización hidroeléctrica · 2.23.0

Los nueve proyectos hidroeléctricos tienen coordenadas oficiales PLAHE, identificadas como puntos de referencia del aprovechamiento. La fuente y precisión figuran en la ficha; no equivalen necesariamente al edificio de la central. [Incorporación y verificación](docs/36_INCORPORACION_LOCALIZACIONES_HIDRO.md).

La regeneración desde el inventario auditado aplica automáticamente `data/localizaciones_hidroelectricas.json`. Para aplicar sólo las localizaciones: `python scripts/aplicar_localizaciones_hidro.py`. Verificación: `python scripts/validar_localizaciones_hidro.py`.


### Escenario Total · 2.24.0

Total incorpora los 22 proyectos de la cartera habilitada: 1.635,17 MW adicionales en operación en 2050. Disponible en Escenarios de futuro y Comparador. Conserva el calendario de Intensivo e incorpora Rada Tilly, El Angelito y El Escorial en 2050 como hipótesis. [Definición y validación](docs/37_ESCENARIO_TOTAL.md).


### Barras laterales y secciones web · 2.25.0

Los cinco módulos comparten un lateral fijo bajo la cabecera. Escenarios reúne allí escenarios, territorio, año y accesos al máximo y a 2050. En pantallas pequeñas se abre como panel fijo. Las secciones de lectura incorporan fondos suaves y separadores, con encabezados adaptables. [Organización y verificación](docs/38_BARRAS_LATERALES_Y_SECCIONES_WEB.md). Validación: python scripts/validar_estructura_web.py.

### Textos claros y cercanos · 2.26.0

Relatos e instrucciones más sencillos, con foco en cómo los proyectos generan trabajo, llegada de personas y nuevas necesidades educativas. Se explican tendencial, estudiantes potenciales y los supuestos de salida al terminar las obras. Incluye ayudas de los cinco módulos. [Revisión editorial](docs/39_TEXTOS_CLAROS_Y_CERCANOS.md).
