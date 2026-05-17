import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT_PATH = REPO_ROOT / "dist-print/question_replacement_template.xlsx"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "src/data/questions.json"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def main():
    parser = argparse.ArgumentParser(
        description="Import filled question_replacement_template.xlsx into src/data/questions.json"
    )
    parser.add_argument("--input", default=str(DEFAULT_INPUT_PATH), help="Input .xlsx path")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH), help="Output questions.json path")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    rows = read_worksheet_rows(input_path, "xl/worksheets/sheet1.xml")
    questions = build_questions(rows)

    output_path.write_text(
        f"{json.dumps(questions, ensure_ascii=False, indent=2)}\n",
        encoding="utf-8",
    )
    try:
        display_path = output_path.relative_to(REPO_ROOT)
    except ValueError:
        display_path = output_path

    print(f"Imported {len(questions)} questions to {display_path}")


def read_worksheet_rows(path, sheet_member):
    with zipfile.ZipFile(path) as archive:
        shared_strings = read_shared_strings(archive)
        root = ET.fromstring(archive.read(sheet_member))

    parsed_rows = []
    for row in root.findall(".//x:sheetData/x:row", NS):
        values = {}
        for cell in row.findall("x:c", NS):
            reference = cell.attrib.get("r", "")
            col_index = column_index(reference)
            values[col_index] = read_cell_value(cell, shared_strings)

        if values:
            max_col = max(values)
            parsed_rows.append([values.get(index, "") for index in range(1, max_col + 1)])

    return parsed_rows


def read_shared_strings(archive):
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("x:si", NS):
        strings.append("".join(text.text or "" for text in item.findall(".//x:t", NS)))

    return strings


def read_cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")

    if cell_type == "inlineStr":
        return "".join(text.text or "" for text in cell.findall(".//x:t", NS)).strip()

    value = cell.find("x:v", NS)
    if value is None or value.text is None:
        return ""

    if cell_type == "s":
        index = int(value.text)
        return shared_strings[index].strip() if index < len(shared_strings) else ""

    return value.text.strip()


def build_questions(rows):
    if len(rows) < 5:
        return []

    headers = [normalize_header(value) for value in rows[3]]
    questions = []

    for row in rows[4:]:
        record = {
            headers[index]: row[index].strip() if index < len(row) and isinstance(row[index], str) else row[index]
            for index in range(min(len(headers), len(row)))
            if headers[index]
        }
        question_id = str(record.get("id", "")).strip()
        if not question_id:
            continue

        choices = [
            str(record.get(f"choice{index}", "")).strip()
            for index in range(1, 5)
        ]
        translation_choices = [
            str(record.get(f"translationchoice{index}", "")).strip()
            for index in range(1, 5)
        ]
        question = {
            "id": question_id,
            "side": str(record.get("side", "")).strip(),
            "language": str(record.get("language", "")).strip(),
            "difficulty": str(record.get("difficulty", "")).strip(),
            "points": to_int(record.get("points", 0), fallback=0),
            "question": str(record.get("question", "")).strip(),
            "choices": choices,
            "answerIndex": to_int(record.get("answerindex", 0), fallback=0),
            "explanation": str(record.get("explanation", "")).strip(),
        }
        translation_text = combine_translation(
            str(record.get("translationquestion", "")).strip(),
            translation_choices,
            str(record.get("translationtext", "")).strip(),
        )

        if translation_text:
            question["translationText"] = translation_text

        translation_explanation = str(record.get("translationexplanation", "")).strip()
        if translation_explanation:
            question["translationExplanation"] = translation_explanation

        questions.append(question)

    return questions


def combine_translation(translation_question, translation_choices, legacy_translation_text=""):
    lines = []

    if translation_question:
        lines.extend(line.strip() for line in translation_question.splitlines() if line.strip())

    for label, choice in zip("ABCD", translation_choices):
        if choice:
            lines.append(f"{label}. {choice}")

    if lines:
        return "\n".join(lines)

    return legacy_translation_text


def normalize_header(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").strip().lower())


def to_int(value, fallback):
    try:
        return int(float(str(value).strip()))
    except ValueError:
        return fallback


def column_index(reference):
    letters = "".join(char for char in reference if char.isalpha())
    index = 0
    for char in letters:
        index = index * 26 + ord(char.upper()) - 64
    return index


if __name__ == "__main__":
    main()
