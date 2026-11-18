# Referencias cartográficas eólicas · 2.27.0

Solicitud del 18/11/2026: representar La Flecha mediante una referencia del predio y los otros dos proyectos mediante puntos orientativos dentro de sus departamentos.

| Registro | Tipo de referencia | Longitud | Latitud |
|---|---|---:|---:|
| Parque Eólico El Escorial | Ubicación orientativa en Gastre | -68.938573 | -42.669394 |
| Parque Eólico Aluar – Etapa II | Ubicación orientativa en Biedma | -65.194585 | -42.439422 |
| Parque Eólico La Flecha (Aluar) | Punto de referencia del predio | -65.389165 | -42.726369 |

La Flecha usa el promedio de los cuatro vértices publicados en la Tabla 1, página 9 del informe de monitoreo incluido en el EsIA de Aluar V y VI. Es una referencia del predio, no una turbina ni un edificio. Fuente: https://www.aluar.com.ar/assets/admin/archivos/menu_principal/pdf/72/ampliacion_peal_etapa_v_iv.pdf

El Escorial y Aluar–Etapa II (96 MW) usan puntos interiores calculados sobre las geometrías departamentales de Gastre y Biedma. No son emplazamientos verificados. Se identifican con ≈ y una aclaración en las ayudas y fichas de los módulos 01 y 04. Los mapas del Comparador siguen agregados por departamento.

La definición está en data/referencias_cartograficas.json. El importador auditado restaura estas referencias después de las nueve hidroeléctricas. Se registran sus fuentes, cobertura y limitaciones. Los 92 registros tienen representación, incluidos los dos puntos departamentales orientativos.

Verificación: validar_referencias_cartograficas.py comprueba puntos interiores, regeneración, idempotencia y conservación de atributos productivos frente al inventario anterior. También pasaron validar_localizaciones_hidro.py, validar_escenarios_futuro.mjs y validar_estructura_web.py. Los resultados de los escenarios se conservan. Revisión en navegador de mapas, etiquetas y fichas de La Flecha y El Escorial.
