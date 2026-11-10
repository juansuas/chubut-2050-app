# Chubut 2050 V2

Aplicación web estática con tres módulos activos: `Demografía`, `Oferta y capacidad` y `Producción y desarrollo energético`.

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

El piso térmico parcial usa CAMMESA 2026-09. Se vincula por código de central y se exige generación positiva y potencia instalada informada en el mismo corte. Biedma suma 189 MW (ALUAR) y Escalante 245,835 MW (PATA, ELEP y MBE2). MBE2 aporta 57,735 MW de autogeneración no firme para el MEM. El segundo registro de Manantiales Behr II permanece sin verificar y fuera de la suma. CRIV registra generación pero queda pendiente de asignación georreferenciada sin duplicar unidades. PMAD carece de generación positiva en el corte. Los sistemas aislados siguen pendientes de verificación con fuentes locales.

El cotejo de capacidad instalada con CAMMESA (Informe Mensual, septiembre de 2026, hoja «RESUMEN por MAQUINA», detalle del mes para Chubut) confirma 19 de los 21 parques eólicos vinculados por código. Para esos 21 parques, el inventario de referencia 2023 suma 1.226,41 MW y CAMMESA registra 1.311,91 MW. Las diferencias corresponden a Aluar (162 → 243 MW) y Manantiales (99 → 103,50 MW). CAMMESA también registra 3 MW para El Tordillo, ya localizado en el inventario y sin valor de capacidad instalada en la base activa. El total eólico informado por CAMMESA para Chubut es 1.314,91 MW. El simulador toma los 1.314,91 MW de CAMMESA como piso documentado, distribuidos por departamento según el inventario SPIA.

La unidad de georreferenciación es la instalación y la unidad de agregación es el departamento. La publicación inicial incluye 82 registros: 34 eólicos, 2 hidroeléctricos y 46 térmicos. Los 34 parques eólicos se separan en 23 operativos y 11 proyectados según SPIA. Petróleo, gas e hidrógeno permanecen contemplados en los catálogos, pero no se publican como puntos hasta contar con fuentes que permitan localizar una unidad de observación consistente.

`TotEnergia` del SPIA se conserva como potencia declarada del proyecto. No se trata automáticamente como capacidad instalada. CAMMESA aporta capacidad instalada a 22 de los 23 parques operativos. El parque restante queda sin valor verificado. La app muestra ambos campos por separado y no imputa operador, empleo ni producción cuando faltan.

El módulo ofrece mapa, filtros por departamento, actividad, operador/agente y estado, fichas con fuentes, indicadores, capacidad instalada por departamento y actividad, comparación separada con proyectos futuros, composición de la matriz y exportación del inventario. El mapa se limita a las localizaciones: todos los símbolos tienen el mismo tamaño; el pictograma y el color distinguen la actividad y el borde comunica el estado. La capacidad se compara en los gráficos departamentales, no mediante el tamaño de los puntos.

La misma capa incorpora un constructor de cambios productivos con seis parámetros: departamento, tecnología, ampliación o reducción, MW modificados, año de entrada en operación y empleos permanentes por MW. La capacidad observada permanece inalterada. Los coeficientes no tienen valores predeterminados hasta contar con fuentes documentadas y todo valor ingresado se identifica como supuesto del usuario. El modelo excluye el empleo temporal; sólo deja una nota metodológica sobre su posible incorporación futura. La integración con población y educación queda preparada en el contrato `V2/01_Documentacion/21_CONTRATO_DATOS_CAPA_PRODUCTIVA.md`, pero todavía no aplica impactos sobre las proyecciones.

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
