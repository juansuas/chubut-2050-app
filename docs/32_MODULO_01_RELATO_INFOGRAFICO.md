# Módulo 01 · relato infográfico · 2.20.0

Reorganización local del 18/11/2026. Reemplaza el armado del documento 31.

## Recorrido

1. Apertura con la pregunta del escenario y cadena proyectos → empleo → población → educación. La cartera es del período completo; los otros tres valores pertenecen al año seleccionado, identificado explícitamente.
2. Proyectos: cantidad, MW, tecnologías, departamentos y fechas calculadas. Mapa departamental sin exigir coordenadas puntuales. Calendario de construcción y operación con botones que actualizan el año.
3. Población: explicación del mecanismo, máximo y horizonte 2050, descomposición del máximo entre población de obra y operación. Se conserva la comparación tendencial/escenario, hitos y switch de consulta, abriendo en población.
4. Educación: texto de interpretación y cuatro gráficos siempre visibles, con eje temporal y escala vertical compartidos. Cada nivel muestra máximo propio, año seleccionado y horizonte 2050. Se aclara que máximos de distintos años no se suman.
5. Territorios: hallazgos provinciales calculados para el año, mapa y ranking. La comparación departamental mantiene el total de niveles, explícitamente identificado.
6. Calendario completo y supuestos en desplegable final.

Los textos responden al escenario y territorio. Los territorios sin proyectos informan ausencia de incremento sin un año de máximo ficticio. Se conserva el modelo, datos y supuestos. No se publicó.

## Comprobaciones

Validadores `validar_escenarios_futuro.mjs` y `validar_vista_futuro.mjs` aprobados; sintaxis JavaScript y anidación HTML verificadas. Comparación de secciones HTML 02, 03 y 04 con respaldo anterior: idénticas.

Navegador: Moderado provincial (14 proyectos, 589,17 MW), Intensivo provincial (19, 1.083,17 MW), Languiñeo, Gastre sin proyectos, calendario interactivo y máximo verificados. Cuatro curvas educativas revisadas visualmente. Vista móvil 390 px sin desbordamiento horizontal y selectores ajustados. No se observaron errores de consola durante la revisión.

Respaldo previo: `D:/91_CFI_II/tmp/modulo01_pre_infografia/`.
