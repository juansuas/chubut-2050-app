# Módulo 01 · tablero territorial y trayectorias coordinadas

Reorganización local 2.18.0 · 18/11/2026. Sustituye la organización de interfaz descripta en el documento 29. No modifica cartera, calendario, coeficientes, perfil migratorio, tasas censales o fórmulas anteriores.

## Contexto y lectura

Moderado e Intensivo conservan sus selecciones y fechas. Un contexto propio del módulo reúne escenario, territorio y año de lectura (2026–2050). El horizonte sigue siendo 2050. La selección no escribe filtros de Demografía, Educación ni el escenario editable de Productivos.

Los indicadores muestran la demanda tendencial y del escenario en el año seleccionado, el máximo de demanda adicional del territorio durante el período y el resultado de 2050. Población adicional, población total y MW incorporados aportan el contexto productivo y poblacional. Se aclara que el resultado de un año no es un acumulado de estudiantes nuevos.

## Gráfico principal

Un único gráfico Plotly contiene dos franjas con el mismo eje temporal y escalas verticales independientes:

- Arriba, población total tendencial y con proyectos.
- Abajo, demanda educativa potencial por nivel, o población en edades educativas mediante selector.

Los niveles son Inicial (0–5), Primario (6–11), Secundario (12–17) y Secundario a los 18. Los controles permiten activar niveles, ocultar curvas tendenciales o de escenario y ocultar hitos. Estos controles sólo cambian la presentación; los indicadores conservan todas las series.

Las líneas continuas son tendenciales y las punteadas corresponden al escenario. Rombo y triángulo indican inicio de obra y entrada en operación. Los hitos se agrupan por año, tienen información del proyecto al pasar el puntero y se repiten como botones accesibles. Un clic en un año del gráfico o en un hito actualiza el contexto. La referencia numérica tendencial permanece disponible aunque se oculte su curva.

## Mapa y departamentos

El mapa combina límites departamentales coloreados por demanda adicional absoluta o variación relativa local y puntos de instalaciones operativas y proyectos seleccionados. Los pictogramas diferencian eólica, hidroeléctrica y térmica; el estado visual distingue base operativa, proyecto futuro, obra y operación. El estado corresponde al calendario hipotético del escenario y al año de lectura.

Los proyectos sin coordenadas se conservan en los cálculos, indicadores y calendario, con un aviso de cobertura. No se inventan coordenadas. La escala de color es fija entre escenarios y años para cada métrica. Seleccionar un departamento sincroniza la lectura territorial; seleccionar un punto también abre su información y accesos al inicio de obra u operación.

La tabla compara todos los departamentos para el escenario y año de lectura, aunque haya un territorio seleccionado para el resto del tablero. Incluye demanda tendencial local, demanda adicional, variación relativa y máximo local con su año. Se puede ordenar por incremento del año, porcentaje local o máximo del período. El botón del máximo lleva a ese departamento y año.

Los porcentajes dividen la demanda adicional por la demanda tendencial del mismo territorio y año. Los máximos locales no se suman, porque pueden ocurrir en años diferentes. Los departamentos sin incremento no reciben una fecha de máximo ficticia.

## Tasas y modelo

La tabla por nivel muestra población en edades educativas, tasa equivalente ponderada de asistencia, demanda tendencial, demanda con proyectos y diferencia. Las tasas están disponibles como referencia; esta reorganización no introduce cambios de cobertura ni edita los controles del módulo Educación.

`future-territories.js` amplía las agregaciones de `future-model.js`. Reutiliza `educationImpact` con tasas censales para la demanda y con tasa unitaria para recuperar la población por edades, conservando el envejecimiento de cohortes y las reglas de fase existentes. El efecto sobre población total y capacidad utiliza `projectImpact`.

## Verificación

- `validar_escenarios_futuro.mjs`: resultados anteriores preservados; sumas provinciales/departamentales en 25 años; suma por nivel; población por edades; cambio de fase en inicio de obra y operación; denominador relativo del mismo año.
- Caso intensivo Languiñeo: máximo de demanda adicional 890,994827 en 2045; variación local 210,410001 %; incremento de 2050 de 53,057682. Valores verificados sin modificar parámetros.
- Pruebas anteriores de proyectos, migración y coordinación productiva aprobadas.
- Comparación SHA-256 de los datos y módulos anteriores, incluida la configuración de escenarios; secciones HTML de Demografía y Educación idénticas. IDs, anidación HTML y referencias ARIA comprobados.
- Navegador: selección del máximo de Languiñeo sincroniza territorio y año; control de visibilidad tendencial responde sin alterar la referencia numérica; franjas y hitos revisados visualmente; selección de Escalante actualiza el mapa y muestra 15 puntos con coordenadas en ese territorio. Revisión en el ancho disponible; no constituye una prueba exhaustiva en todos los dispositivos.

La entrega sigue siendo local: `http://127.0.0.1:8125/#escenarios`.
