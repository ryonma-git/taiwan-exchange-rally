import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape


REPO_ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = REPO_ROOT / "src/data/questions.json"
OUTPUT_PATH = REPO_ROOT / "dist-print/question_replacement_template.xlsx"

HEADERS = [
    "id",
    "side",
    "language",
    "difficulty",
    "points",
    "question",
    "choice1",
    "choice2",
    "choice3",
    "choice4",
    "answerIndex",
    "explanation",
    "translationText",
    "notes",
]

COLUMN_WIDTHS = [10, 14, 12, 14, 10, 42, 22, 22, 22, 22, 12, 42, 48, 26]


def main():
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    rows = build_question_rows(questions)
    rules_rows = build_rules_rows()
    lists_rows = build_lists_rows()

    with zipfile.ZipFile(OUTPUT_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        write_package_parts(archive)
        archive.writestr("xl/workbook.xml", workbook_xml())
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml())
        archive.writestr("xl/styles.xml", styles_xml())
        archive.writestr(
            "xl/worksheets/sheet1.xml",
            worksheet_xml(
                rows,
                title="questions",
                widths=COLUMN_WIDTHS,
                frozen_rows=4,
                auto_filter=f"A4:N{len(rows)}",
                data_validations=question_data_validations(len(rows)),
            ),
        )
        archive.writestr(
            "xl/worksheets/sheet2.xml",
            worksheet_xml(rules_rows, title="rules", widths=[22, 110], frozen_rows=1),
        )
        archive.writestr(
            "xl/worksheets/sheet3.xml",
            worksheet_xml(lists_rows, title="lists", widths=[18, 18, 54], frozen_rows=1),
        )

    print(f"Generated {OUTPUT_PATH.relative_to(REPO_ROOT)}")


def build_question_rows(questions):
    rows = [
        [
            "問題差し替えテンプレート",
            "J問題は日本語、C問題は繁体字中国語（台湾華語）で入力します。idは変更しないでください。",
        ],
        [
            "使い方",
            "choice1〜choice4に選択肢を入力し、answerIndexは正解の番号を0〜3で入力します。translationTextは任意です。",
        ],
        [
            "注意",
            "J21/J22/C21/C22はサンプル提示用ページです。残す場合は内容を確認し、本番に不要なら後で削除できます。",
        ],
        HEADERS,
    ]

    for question in questions:
        choices = list(question.get("choices", []))
        choices += [""] * (4 - len(choices))
        rows.append(
            [
                question.get("id", ""),
                question.get("side", ""),
                question.get("language", ""),
                question.get("difficulty", ""),
                question.get("points", ""),
                question.get("question", ""),
                choices[0],
                choices[1],
                choices[2],
                choices[3],
                question.get("answerIndex", ""),
                question.get("explanation", ""),
                question.get("translationText", ""),
                "",
            ]
        )

    return rows


def build_rules_rows():
    return [
        ["項目", "説明"],
        ["id", "問題IDです。J01-J20、C01-C20を本番用に使います。J21/J22/C21/C22はサンプル提示用です。"],
        ["side", "分類です。例: Japan / Culture / Wenchang / Chiayi など。"],
        ["language", "J問題は ja、C問題は zh-Hant を入力します。"],
        ["difficulty", "easy / normal / hard / placeholder など。"],
        ["points", "得点です。数字で入力します。例: 10, 15, 20。"],
        ["question", "問題文です。J問題は日本語、C問題は繁体字中国語で入力します。"],
        ["choice1〜choice4", "四択の選択肢です。"],
        ["answerIndex", "正解の選択肢番号です。choice1=0、choice2=1、choice3=2、choice4=3。"],
        ["explanation", "回答後に表示する解説です。"],
        ["translationText", "任意です。翻訳の鍵を使ったときに表示する翻訳です。ヒントではなく翻訳として書きます。"],
        ["notes", "作業メモ用です。アプリには取り込みません。"],
    ]


def build_lists_rows():
    return [
        ["list", "value", "note"],
        ["language", "ja", "日本語の問題"],
        ["language", "zh-Hant", "繁体字中国語（台湾華語）の問題"],
        ["difficulty", "placeholder", "仮問題"],
        ["difficulty", "easy", "やさしい"],
        ["difficulty", "normal", "ふつう"],
        ["difficulty", "hard", "むずかしい"],
        ["answerIndex", 0, "choice1が正解"],
        ["answerIndex", 1, "choice2が正解"],
        ["answerIndex", 2, "choice3が正解"],
        ["answerIndex", 3, "choice4が正解"],
    ]


def write_package_parts(archive):
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    archive.writestr(
        "[Content_Types].xml",
        xml_decl(
            """
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>
""".strip()
        ),
    )
    archive.writestr(
        "_rels/.rels",
        xml_decl(
            """
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
""".strip()
        ),
    )
    archive.writestr(
        "docProps/core.xml",
        xml_decl(
            f"""
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Question Replacement Template</dc:title>
  <dc:creator>taiwan-exchange-rally</dc:creator>
  <cp:lastModifiedBy>taiwan-exchange-rally</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
""".strip()
        ),
    )
    archive.writestr(
        "docProps/app.xml",
        xml_decl(
            """
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>taiwan-exchange-rally</Application>
</Properties>
""".strip()
        ),
    )


def workbook_xml():
    return xml_decl(
        """
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="questions" sheetId="1" r:id="rId1"/>
    <sheet name="rules" sheetId="2" r:id="rId2"/>
    <sheet name="lists" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>
""".strip()
    )


def workbook_rels_xml():
    return xml_decl(
        """
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
""".strip()
    )


def styles_xml():
    return xml_decl(
        """
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Aptos"/></font>
    <font><b/><sz val="16"/><color rgb="FF13345B"/><name val="Aptos"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
    <font><b/><sz val="11"/><color rgb="FF13345B"/><name val="Aptos"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2367A5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF3FB"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE3D8CB"/></left><right style="thin"><color rgb="FFE3D8CB"/></right><top style="thin"><color rgb="FFE3D8CB"/></top><bottom style="thin"><color rgb="FFE3D8CB"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
""".strip()
    )


def worksheet_xml(rows, title, widths, frozen_rows=0, auto_filter=None, data_validations=None):
    max_col = max(len(row) for row in rows)
    dimension = f"A1:{column_name(max_col)}{len(rows)}"
    cols = "".join(
        f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>'
        for index, width in enumerate(widths, start=1)
    )
    sheet_view = '<sheetViews><sheetView workbookViewId="0">'
    if frozen_rows:
        sheet_view += (
            f'<pane ySplit="{frozen_rows}" topLeftCell="A{frozen_rows + 1}" '
            'activePane="bottomLeft" state="frozen"/>'
        )
    sheet_view += "</sheetView></sheetViews>"
    sheet_data = "".join(row_xml(row, row_number) for row_number, row in enumerate(rows, start=1))
    auto_filter_xml = f'<autoFilter ref="{auto_filter}"/>' if auto_filter else ""
    validations_xml = data_validations_xml(data_validations or [])

    return xml_decl(
        f"""
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="{dimension}"/>
  {sheet_view}
  <cols>{cols}</cols>
  <sheetData>{sheet_data}</sheetData>
  {auto_filter_xml}
  {validations_xml}
</worksheet>
""".strip()
    )


def row_xml(row, row_number):
    style = 1 if row_number == 1 else 3 if row_number in (2, 3) else 2 if row_number == 4 else 4
    height = 34 if row_number == 1 else 46 if row_number in (2, 3) else 28 if row_number == 4 else 58
    cells = "".join(cell_xml(value, row_number, col_number, style) for col_number, value in enumerate(row, start=1))
    return f'<row r="{row_number}" ht="{height}" customHeight="1">{cells}</row>'


def cell_xml(value, row_number, col_number, style):
    ref = f"{column_name(col_number)}{row_number}"
    if value is None or value == "":
        return f'<c r="{ref}" s="{style}"/>'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    text = escape(str(value), {'"': "&quot;"})
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def data_validations_xml(validations):
    if not validations:
        return ""
    items = []
    for validation in validations:
        attrs = " ".join(f'{key}="{escape(str(value))}"' for key, value in validation["attrs"].items())
        formulae = "".join(f"<formula{index}>{escape(str(formula))}</formula{index}>" for index, formula in enumerate(validation["formulae"], start=1))
        items.append(f"<dataValidation {attrs}>{formulae}</dataValidation>")
    return f'<dataValidations count="{len(items)}">{"".join(items)}</dataValidations>'


def question_data_validations(row_count):
    if row_count < 5:
        return []
    last_row = row_count
    return [
        {
            "attrs": {
                "type": "list",
                "allowBlank": "1",
                "showErrorMessage": "1",
                "sqref": f"C5:C{last_row}",
            },
            "formulae": ['"ja,zh-Hant"'],
        },
        {
            "attrs": {
                "type": "list",
                "allowBlank": "1",
                "showErrorMessage": "1",
                "sqref": f"D5:D{last_row}",
            },
            "formulae": ['"placeholder,easy,normal,hard"'],
        },
        {
            "attrs": {
                "type": "whole",
                "operator": "between",
                "allowBlank": "1",
                "showErrorMessage": "1",
                "sqref": f"E5:E{last_row}",
            },
            "formulae": ["0", "100"],
        },
        {
            "attrs": {
                "type": "whole",
                "operator": "between",
                "allowBlank": "1",
                "showErrorMessage": "1",
                "sqref": f"K5:K{last_row}",
            },
            "formulae": ["0", "3"],
        },
    ]


def column_name(index):
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def xml_decl(body):
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n{body}\n'


if __name__ == "__main__":
    main()
