"""Uso: python importar_perfiles_migrantes.py carpeta_con_cuadros_xlsx."""
import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook


def counts(value):
    if value == "-":
        return 0
    if not isinstance(value, int) or value < 0:
        raise ValueError(f"Recuento censal inesperado: {value!r}")
    return value


def load_rows(path, sheet):
    with path.open("rb") as file:
        workbook = load_workbook(file, read_only=True, data_only=True)
        tab = next(tab for tab in workbook if " ".join(tab.title.split()) == sheet)
        return list(tab.values)


def profile(migration, education, preschool_scale=1):
    sexes = {"Mujer/Femenino": "F", "Varón/Masculino": "M"}
    assert migration[3][5:7] == ("Otra provincia argentina", "Otro país")
    residents = {}
    sex = None
    for row in education[4:]:
        heading = str(row[0]).replace(" ", "")
        if heading in sexes:
            sex = sexes[heading]
        if sex and re.fullmatch(r"[0-9]+", str(row[1] or "")):
            residents[sex, int(row[1])] = counts(row[2])
    observed, estimates, controls = {}, {}, {}
    sex = None
    for row in migration[4:]:
        heading = str(row[0]).replace(" ", "")
        if heading in sexes:
            sex = sexes[heading]
            controls[sex] = counts(row[5]) + counts(row[6])
        label = str(row[1] or "")
        if not sex or not (re.fullmatch(r"\d+-\d+", label) or label.startswith("90 ")):
            continue
        low, high = map(int, label.split("-")) if "-" in label else (90, 90)
        migrant_count = counts(row[5]) + counts(row[6])
        if low == 90:
            # Grupo abierto. Permanece íntegro y fuera de las edades escolares.
            observed[sex, 90] = migrant_count
            continue
        ages = range(low, high + 1)
        local_count = sum(residents[sex, age] for age in ages)
        for age in ages:
            observed[sex, age] = migrant_count * residents[sex, age] / local_count
        if low == 5:
            for age in range(5):
                estimates[sex, age] = preschool_scale * migrant_count * residents[sex, age] / local_count
    for sex, expected in controls.items():
        assert abs(sum(n for (s, _), n in observed.items() if s == sex) - expected) < 1e-7
    total = sum(observed.values()) + sum(estimates.values())
    return {
        "migrantes_5_mas": sum(controls.values()),
        "menores_5_estimados": sum(estimates.values()),
        "edades": [{"edad": age, "sexo": sex, "peso": count / total}
                   for (sex, age), count in sorted((observed | estimates).items())],
    }


if __name__ == "__main__":
    directory = Path(sys.argv[1])
    profiles = {}
    for key, name, province, migration_sheet, education_sheet in [
        ("confluencia", "Confluencia", "neuquen", "Cuadro 4.15.6", "Cuadro 1.15.6"),
    ]:
        inputs = (load_rows(directory / f"{province}-mig.xlsx", migration_sheet),
                  load_rows(directory / f"{province}-edu.xlsx", education_sheet))
        profiles[key] = {"nombre": name, **profile(*inputs),
                         "sensibilidad": {f"{scale:.2f}": profile(*inputs, scale) for scale in (0.75, 1.25)}}
    output = Path(__file__).resolve().parents[1] / "data" / "perfiles_migrantes.json"
    output.write_text(json.dumps(profiles, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    for name, p in profiles.items():
        print(name, p["migrantes_5_mas"], round(p["menores_5_estimados"], 2))
