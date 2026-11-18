# Contrato de datos del simulador productivo poblacional y educativo

Versión funcional 2.15.0 · 17 de noviembre de 2026.

La capa productiva corresponde a la **capa / módulo 04** (`#productivos`). La numeración común de las cinco capas y módulos se documenta en [README de la app](../03_App/README.md#numeración-de-capas-y-módulos).

## Alcance acordado

El contrato del simulador exploratorio permite avanzar con la interfaz y el diseño de escenarios. La comparación poblacional y la demanda educativa adicional se calculan en el módulo Productivos. La incorporación de estas salidas a los módulos de Demografía y Oferta educativa continúa pendiente.

## Fuentes y entradas

El inventario procede de la hoja Capa construida de la auditoría del 9 de noviembre, mediante scripts/importar_inventario_auditado.py y los archivos publicados en V2/03_App/data. Cada instalación conserva ID estable, departamento INDEC, tecnología, estado, potencia, fuente y fila de auditoría. Los registros sin coordenadas participan en tablas y cálculos. La capacidad instalada se distingue de la potencia proyectada y de la histórica sin estado operativo confirmado.

Cada proyecto se activa una sola vez mediante instalacion_id y anio_operacion, entre 2026 y 2050. Los MW, la tecnología y el departamento se obtienen del inventario. Los proyectos con nota de conciliación pendiente quedan visibles y deshabilitados. El equipo resolvió las dos incidencias de potencia e identidad el 17 de noviembre de 2026.

La población base conserva la proyección departamental vigente. Las tasas de asistencia se toman por departamento, grupo de edad y sexo, con respaldo provincial cuando falta el valor departamental.

## Parámetros adoptados del informe metodológico

| Tecnología | Obra empleos/MW | O&M empleos/MW | Obra años | Personas por hogar | Empleo asociado por directo | Puestos migrantes |
|---|---:|---:|---:|---:|---:|---:|
| Eólica | 2,9 | 0,30 | 2 | 3,093 | 1,617 | 31,0 % |
| Ciclo combinado | 2,0 | 0,12 | 3 | 3,110 | 1,367 | 32,5 % |
| Hidro PAH | 11,0 | 1,10 | 3 | 3,110 | 2,026 | 27,8 % |
| Hidro grande | 6,0 | 0,35 | 5 | 3,143 | 2,467 | 29,0 % |

Los valores proceden de las secciones 3.4 y 3.5.1 de 01_Documentacion/Chubut_2050_Etapa_3_Informe_metodologico_tecnico.docx. Son parámetros de simulación. La configuración central está implementada. Los rangos bajo y alto del informe siguen disponibles para futuros escenarios de sensibilidad.

## Controles de escenario

- Incluir empleo asociado, activado inicialmente.
- Incluir migración externa, activado inicialmente.
- Incluir construcción, desactivado inicialmente.
- Porcentaje de los migrantes que llegan desde fuera de Chubut, numérico entre 0 y 100. Valor inicial de 100 para preservar el supuesto previo. Es una hipótesis editable global del escenario y se aplica en ambas fases.
- Año de análisis y territorio para las comparaciones, independientes del calendario de activación de cada proyecto.

El porcentaje migrante de cada tecnología y la proporción extraprovincial son parámetros distintos. El segundo se aplica sobre el primero.

## Reglas de cálculo

Empleo directo = MW del proyecto × empleos por MW de la fase.

Empleo asociado = empleo directo × factor asociado, o cero si se desactiva.

Puestos migrantes = (empleo directo + asociado) × proporción migrante tecnológica.

Incremento extraprovincial = puestos migrantes × personas por hogar × proporción extraprovincial editable. El factor familiar incluye al trabajador.

La casilla de migración externa excluye el incremento poblacional y su demanda educativa al desactivarse. Los puestos de trabajo siguen disponibles. Se mantienen decimales durante los cálculos y se redondea sólo al presentar.

El aporte laboral cubierto desde Chubut se supone residente del propio departamento del proyecto. Ya está incluido en la población base departamental y su incorporación al empleo no agrega residentes ni demanda educativa por migración. Se omiten desplazamientos entre departamentos en el alcance adoptado.

El empleo de obra se aplica desde el año de puesta en marcha menos la duración de construcción, hasta el año previo a la entrada. En el año de entrada termina el impacto temporal y comienza el de operación. Se suman fases de proyectos distintos que coinciden en el mismo año.

## Perfil por edad y sexo

Confluencia es el único perfil activo. Se usa el Cuadro 4.15.6 del Censo 2022 para personas de cinco años o más que residían fuera de Neuquén o del país en 2017. El Cuadro 1.15.6 de Educación permite distribuir los grupos quinquenales por edad simple y sexo.

Las edades 0 a 4 se imputan mediante la razón entre cada edad y el total de 5 a 9, por sexo y territorio, aplicada al recuento migrante de 5 a 9. La sensibilidad varía esa imputación ±25 % y renormaliza el perfil. La suma de pesos es uno. El perfil representa personas migrantes y una imputación para los más pequeños. Se adopta esta aproximación como perfil único para el alcance exploratorio cerrado.

Las cohortes envejecen desde el inicio de la fase. La cohorte temporal de obra sale al comenzar la operación y se introduce la correspondiente a operación. El grupo abierto de 90 años y más queda fuera de las edades educativas. El ejercicio mantiene el total de personas de cada fase y omite nacimientos y defunciones adicionales.

## Salidas

- Capacidad y empleo por proyecto, fase, departamento y año.
- Incremento extraprovincial anual por fase, departamento y total provincial.
- Población base, población con proyectos e incremento por departamento y año.
- Demanda educativa adicional de Confluencia por Inicial, Primario, Secundario de 12 a 17 y Secundario a los 18.
- Sensibilidad de Inicial a la imputación de menores de cinco.

Población con proyectos = población base + incremento extraprovincial del escenario.

Por decisión metodológica del equipo, el impacto de los proyectos seleccionados se trata como adicional a la trayectoria de referencia. Se adopta el supuesto de adicionalidad respecto de la base y se omite una corrección por posible solapamiento. El resultado es condicional a este supuesto.

La demanda educativa adicional suma población extraprovincial por edad y sexo multiplicada por la tasa de asistencia del grupo correspondiente en el departamento de destino. La estimación usa tasas censales vigentes y no modifica automáticamente los controles de tasas del módulo Oferta.

## Verificación

Se verifica el escalamiento 0/25/50/100 % para las cuatro tecnologías, el efecto proporcional en educación, el mantenimiento del empleo al variar la proporción extraprovincial, la salida de obra, la entrada de operación y la conservación de sumas departamentales y provinciales. El escenario vacío reproduce la población base y aporta cero demanda adicional. Los controles web guardan su estado y validan el dominio de 0 a 100.

## Alcance cerrado y revisión del inventario

El modelo de escenarios queda cerrado para avanzar con la interfaz. Se adoptan contratación local dentro del propio departamento, adicionalidad del impacto extraprovincial sobre la base, perfil de Confluencia con envejecimiento de cohortes y volumen constante por fase, y salida de la población de obra al comenzar operación. La natalidad, mortalidad, movilidad interdepartamental y reposición de hogares quedan fuera del alcance de esta versión.

La demanda educativa se estima por departamento y nivel. La distribución entre escuelas y el modelado de perfiles de formación profesional corresponden a otros alcances.

La cartera tiene 22 proyectos habilitados con potencia, departamento, identificador y tecnología. Suma 1.635,17 MW, con 1.242,60 MW eólicos y 392,57 MW hidroeléctricos. La auditoría aportada identifica cinco de los proyectos hidroeléctricos como pequeños y se conserva esa clasificación.

El equipo confirmó el 17 de noviembre de 2026:
- Frontera II adopta los 80 MW de la ficha PLAHE. Se conserva el valor original auditado de 46,8 MW en un campo de trazabilidad.
- Aluar Etapa II constituye una ampliación futura de 96 MW independiente de las etapas instaladas.

La cartera no incluye proyectos térmicos. Los coeficientes de ciclo combinado quedan disponibles para futuras incorporaciones respaldadas.

Once proyectos carecen de coordenadas. Tienen departamento y participan en el inventario y el simulador cuando están habilitados. Sus coordenadas son necesarias para mostrarlos como puntos en el mapa, sin afectar el cálculo departamental.

El piso térmico operativo continúa siendo parcial. La ampliación de su cobertura no condiciona el cálculo incremental de proyectos.

Los años de activación se asignan en cada escenario como hipótesis de implementación. La selección de proyectos y sus fechas puede comenzar con la cartera habilitada. Las incidencias de potencia e identidad de los proyectos quedan resueltas para el alcance acordado.
