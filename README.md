# Chubut 2050 V2

Aplicación web estática con dos módulos activos: `Demografía` y `Oferta y capacidad`.

## Fuentes

- Población departamental 2022–2050 por edad simple y sexo: serie ajustada por Santiago Linares para el proyecto, tomando como referencia las proyecciones jurisdiccionales de INDEC. La apertura departamental no es una publicación oficial de INDEC. En 2028 y 2029 conserva diferencias menores frente al control provincial (máximo: 24 personas en el total y 146 por sexo).
- Tasas de asistencia 2022 por departamento, jurisdicción, grupo de edad y sexo: GeoJSON de INDEC/Censo 2022.
- Asistencia a nivel secundario a los 18 años: INDEC, Censo 2022, cuadro 2.5 y cuadros departamentales 2.5.1–2.5.15.
- Matrícula y secciones: `Escuelas Tecnicas con matricula.xlsx`, hoja `Base`, modalidad Común, oferta activa, año 2024.
- Umbrales: `Planificacion_Capacidad_Ociosidad_Brechas_ETP_Chubut.xlsx`, hoja `Metodología`, celda A3.

Las fuentes originales permanecen en `V2/02_Datos/00_Fuentes`. El script de construcción genera tablas canónicas separadas y copias livianas de publicación para la app.

La fuente activa de población se incorpora con `adoptar_proyeccion_linares.py`. El script valida las 29 hojas anuales, la cobertura de 15 departamentos, 101 edades, ambos sexos, claves únicas y la identidad Mujeres + Varones = Total. Conserva una copia sin transformación del XLSX, archiva la serie departamental anterior y publica la misma tabla canónica tanto para Demografía como para los cálculos educativos. Por eso los gráficos demográficos y los factores de matrícula/capacidad se actualizan a partir de una única fuente, sin sobrescribir las tasas ni la matrícula observada.

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

Para cada sección:

```text
capacidad = umbral del nivel
ocupacion_pct = matricula / capacidad * 100
plazas_disponibles = max(0, capacidad - matricula)
sobreocupacion = max(0, matricula - capacidad)
```

Las categorías preservan los cortes ya usados por la aplicación:

- menos de 60%: Capacidad disponible;
- 60% a menos de 85%: Equilibrio;
- 85% a 100%: Alta presión;
- más de 100%: Saturada.

La capacidad es un indicador modelado mediante umbrales. No representa aulas físicas, cargos ni vacantes administrativas observadas.

## Escenario y ancla 2024

Los datos se mantienen separados en cuatro capas: observados, parámetros, cálculos del escenario y agregaciones para las visualizaciones.

Para departamento, grupo, año y sexo:

```text
M_tendencial = PoblacionProyectada * TasaAsistenciaActual
M_potencial = PoblacionProyectada * TasaAsistenciaParametro
```

Estas magnitudes son señales demográficas. Para conservar la coherencia con la matrícula administrativa, la ocupación parte de la sección observada en 2024:

```text
factor_sexo = M_escenario_depto_grupo_sexo_año / M_tendencial_depto_grupo_sexo_2024
matricula_seccion_proyectada_sexo = matricula_seccion_actual_sexo * factor_sexo
matricula_seccion_proyectada = proyectada_mujeres + proyectada_varones
```

Con año 2024 y sliders en la tasa actual, el factor es 1 y la aplicación reproduce la matrícula observada. Los factores de mujeres y varones se calculan por separado y luego se recomponen.

Cada slider expresa un avance relativo entre la tasa actual total del territorio seleccionado y 100%. Ese mismo avance se aplica a las tasas de mujeres y varones, preservando sus diferencias de partida.

El filtro de sexo utiliza matrícula, población y tasa del sexo seleccionado. Las secciones y su capacidad no se desagregan por sexo y permanecen constantes; la ocupación muestra la matrícula proyectada seleccionada respecto de esa capacidad total.

En el gráfico de evolución, la línea continua representa `Población proyectada × tasa actual` y la punteada `Población proyectada × tasa seleccionada`. La vista por nivel suma las matrículas absolutas de los grupos; no promedia tasas.

El dumbbell territorial compara en un único gráfico la tasa actual con la tasa del escenario para cada departamento y para cuatro series: Inicial, Primario, Secundario y 18 años. Los checks sólo controlan la visibilidad de las series; no modifican cálculos. Cada nivel publica una tasa equivalente ponderada por la población proyectada de sus grupos y sexos incluidos en el año activo: `Σ(Poblacion × Tasa) / Σ(Poblacion)`. Nunca usa un promedio simple. Un clic en un marcador sincroniza la selección territorial y recalibra los sliders sobre la tasa actual del departamento.

## Rendimiento de publicación

La app carga datos por módulo. Demografía no descarga la base de secciones hasta ingresar en Oferta y capacidad, y la base histórica `educacion_observada.csv` no se solicita en estos dos módulos. La publicación de población y secciones conserva sólo las columnas consumidas. Los índices de población/tasas, factores de escenario y proyecciones filtradas se reutilizan mediante caché; los cambios rápidos de estado se agrupan en un único render por cuadro de animación.

## Supuesto de distribución proporcional

Para el MVP, la variación de matrícula se distribuye proporcionalmente entre las secciones existentes del mismo departamento y grupo/nivel. No se trasladan estudiantes entre departamentos, niveles ni grupos. Es un supuesto explícito y reemplazable posteriormente por un modelo de asignación territorial o accesibilidad.

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
```

Para abrir la app:

```powershell
& 'C:\Users\apar1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  -m http.server 8125 --directory '.\V2\03_App'
```
