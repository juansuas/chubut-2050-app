# Reorganización de la interfaz productiva · capa / módulo 04

17/11/2026 · revisión local de interfaz 2.16.0.

## Organización

- Contexto común: departamento y año de análisis. El territorio se guarda en `scenarioPopulationDepartment`, separado del territorio compartido por Demografía y Educación.
- Espacio de trabajo: mapa y configuración en dos columnas en escritorio; una columna en pantallas de hasta 900 px. El mapa acompaña el desplazamiento dentro del bloque en escritorio.
- Editor: pestañas «Proyectos del escenario» e «Inventario», con los parámetros globales de empleo, migración y construcción siempre debajo de la lista y junto al mapa.
- Proyectos: selección, potencia, departamento, tecnología y año de entrada. Los registros sin coordenadas siguen disponibles y se señalan explícitamente. Un aviso informa selecciones fuera del territorio o escondidas por el filtro de energía.
- Inventario: filtros por actividad, estado y operador; lista compacta con acceso a la ficha. Los gráficos y totales descriptivos aparecen debajo del espacio de trabajo al abrir esta vista.
- Mapa: en la vista de proyectos muestra la base operativa y los proyectos incluidos; en Inventario responde a sus filtros. Un halo coral identifica proyectos seleccionados. Las fichas se abren debajo del mapa y pueden cerrarse.
- Resultados: pestañas «Capacidad y empleo», «Población» y «Demanda educativa». Indicadores, gráficos y tablas comparten el departamento y año de análisis. Las bases faltantes no se convierten en cero en el nuevo gráfico de capacidad.
- Se elimina la barra lateral duplicada sólo durante la navegación por Productivos. La descarga de inventario CSV queda dentro de la capa 04.
- Las pestañas admiten flechas, Inicio y Fin, y conservan la vista durante la sesión.

## Semántica de las acciones

Cambiar de territorio o filtrar el catálogo no modifica la selección del escenario. El catálogo se limita al departamento y energía de la vista; los resultados se limitan al departamento, sin depender de los filtros descriptivos del inventario ni del filtro de energía del catálogo. Los parámetros de impacto continúan siendo globales.

«Limpiar filtros» restablece actividad, estado y operador del inventario y cierra la ficha. Conserva departamento, año, selección y parámetros del escenario.

«Vaciar escenario» elimina la selección completa de proyectos, también los de otros departamentos. Conserva parámetros, filtros y año de análisis.

El año de entrada de cada proyecto sigue siendo independiente del año de análisis. Las fases, coeficientes, envejecimiento y tasas conservan el contrato vigente.

## Preservación y verificación

Se comparó contra la versión de trabajo inmediatamente anterior a esta reorganización:

- Secciones HTML de Demografía y Oferta y capacidad: idénticas.
- Archivos de datos y módulos de cálculo demográfico y educativo: idénticos mediante SHA-256.
- Funciones numéricas de Productivos y demanda educativa adicional: idénticas. El recorte territorial se aplica al preparar las entradas para la presentación; no se alteran fórmulas ni coeficientes.
- Validación existente `scripts/validar_escenario_proyectos.mjs`: aprobada (modelo, datos, proporción extraprovincial y educación).
- Nueva comprobación `scripts/validar_interfaz_productiva.mjs`: aprobada con inventario real y DOM simulado, incluyendo pestañas, teclado, alcance territorial, filtrado sin pérdida de selección, resultados y estados vacíos. No sustituye una prueba de navegador.
- Sintaxis JavaScript, anidación HTML, referencias ARIA e identificadores únicos: comprobados.

El primer servidor local escuchaba en el puerto 8125 pero no respondía. Tras reiniciarlo en segundo plano se verificó una respuesta HTTP 200 y se abrió la app en el navegador integrado. Se comprobó visualmente la carga del mapa y la disposición junto al editor en el ancho disponible (aproximadamente 930 px). La validación visual completa en móvil y en otros anchos queda pendiente. No se publicó esta revisión.

El filtro Térmica en la cartera explica que no hay proyectos térmicos auditados y ofrece acceso directo al inventario térmico. El inventario conserva 45 registros térmicos: 4 operativos y 41 sin estado confirmado; no se alteraron registros ni potencias.
