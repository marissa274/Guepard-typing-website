"""Render the checkpoint's Markdown documents as printable PDFs.

The converter intentionally covers the small Markdown vocabulary used by these
documents, including their Mermaid ER and state diagrams, without a network
dependency. Run: python3 scripts/render-checkpoint-pdfs.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

from weasyprint import HTML


ROOT = Path(__file__).resolve().parents[1]
DOCUMENTS = [
    ROOT / "docs/design/direction-artistique.md",
    ROOT / "docs/architecture/schema-donnees.md",
    ROOT / "docs/architecture/machine-etats.md",
    ROOT / "docs/architecture/adr-0001-temps-reel-sse.md",
    ROOT / "docs/exigences/matrice-checkpoint-1.md",
]

CSS = """
@page {
  size: A4 portrait;
  margin: 19mm 17mm 17mm;
  @bottom-left { content: "GUÉPARD · Documents du checkpoint 1"; color: #57705b; font-size: 8pt; }
  @bottom-right { content: counter(page); color: #57705b; font-size: 8pt; }
}
body { font-family: Arial, sans-serif; color: #24382a; font-size: 10pt; line-height: 1.44; }
header { border-bottom: 3px solid #5bae4a; margin: 0 0 8mm; padding: 0 0 4mm; }
.kicker { color: #2f6b3d; font-size: 8pt; font-weight: bold; letter-spacing: 1.3pt; text-transform: uppercase; }
h1 { color: #214e30; font-size: 23pt; line-height: 1.12; margin: 2mm 0 0; }
h2 { color: #2f6b3d; font-size: 14pt; line-height: 1.25; margin: 8mm 0 2.5mm; break-after: avoid; }
h3 { color: #2f6b3d; font-size: 11pt; margin: 5mm 0 2mm; break-after: avoid; }
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
ul, ol { margin: 1mm 0 4mm; padding-left: 6mm; }
li { margin: 0 0 2mm; }
strong { color: #173f27; }
code { font-family: 'Courier New', monospace; color: #224b34; background: #eff2e8; padding: .2mm .6mm; border-radius: 1mm; font-size: 8.4pt; overflow-wrap: anywhere; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 8.6pt; table-layout: fixed; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: #2f6b3d; color: white; text-align: left; padding: 2.5mm; }
td { border-bottom: .4pt solid #d9ddce; vertical-align: top; padding: 1.8mm 2.3mm; overflow-wrap: anywhere; }
tr:nth-child(even) td { background: #f8f2e5; }
a { color: #2f6b3d; text-decoration: none; }
.diagram { border: 1pt solid #c7d3b7; border-radius: 3mm; background: #f8f4e9; padding: 4mm; margin: 4mm 0 5mm; break-inside: avoid; }
.diagram-title { color: #2f6b3d; font-size: 8pt; text-transform: uppercase; letter-spacing: .5pt; font-weight: bold; margin-bottom: 3mm; }
.entities { display: flex; gap: 2mm; align-items: stretch; }
.entity { flex: 1; min-width: 0; background: white; border: 1pt solid #90aa7b; border-radius: 2mm; overflow: hidden; }
.entity b { display: block; background: #dce9ce; color: #204e2e; font-size: 8.4pt; padding: 2mm; }
.entity span { display: block; padding: .9mm 1.5mm; border-top: .3pt solid #e6ecdc; font-size: 7pt; overflow-wrap: anywhere; }
.relations { margin: 2.5mm 0 0; font-size: 7.7pt; color: #466348; }
.state-flow { display: flex; gap: 2mm; align-items: center; }
.state { flex: 1; background: white; color: #1e4b2c; border: 1pt solid #5bae4a; border-radius: 3mm; text-align: center; font-weight: bold; padding: 3mm 1mm; font-size: 8pt; }
.arrow { color: #f28c28; font-size: 16pt; font-weight: bold; }
.transitions { margin-top: 3mm; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm 4mm; font-size: 7.6pt; }
.transitions div { border-left: 2pt solid #f6c445; padding-left: 2mm; }
.small-note { color: #596e5b; font-size: 8pt; }
.matrix table { font-size: 8pt; }
.matrix td { padding: 1.3mm 2mm; }
.matrix code { font-size: 7.2pt; }
"""


def inline(value: str) -> str:
    tokens: list[str] = []

    def keep(markup: str) -> str:
        tokens.append(markup)
        return f"ZZZTOKEN{len(tokens) - 1}ZZZ"

    value = re.sub(r"`([^`]+)`", lambda m: keep(f"<code>{html.escape(m.group(1))}</code>"), value)
    value = re.sub(r"\[([^]]+)\]\(([^)]+)\)", lambda m: keep(html.escape(m.group(1))), value)
    value = html.escape(value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    for index in reversed(range(len(tokens))):
        markup = tokens[index]
        value = value.replace(f"ZZZTOKEN{index}ZZZ", markup)
    return value


def render_table(lines: list[str]) -> str:
    rows = [[cell.strip() for cell in line.strip().strip("|").split("|")] for line in lines]
    head = rows[0]
    body = rows[2:]
    column_count = len(head)
    parts = ["<table><thead><tr>"]
    for cell in head:
        parts.append(f"<th>{inline(cell)}</th>")
    parts.append("</tr></thead><tbody>")
    for row in body:
        parts.append("<tr>")
        for cell in (row + [""] * column_count)[:column_count]:
            parts.append(f"<td>{inline(cell)}</td>")
        parts.append("</tr>")
    parts.append("</tbody></table>")
    return "".join(parts)


def render_mermaid(source: str) -> str:
    if source.startswith("erDiagram"):
        entities = re.findall(r"^\s*(\w+)\s*\{([^}]+)\}", source, re.M | re.S)
        relationships = re.findall(r"^\s*(\w+)\s+[|o{}-]+\s+(\w+)\s*:", source, re.M)
        parts = ['<div class="diagram"><div class="diagram-title">Schéma des entités et des relations</div><div class="entities">']
        for name, attributes in entities:
            parts.append(f'<div class="entity"><b>{html.escape(name)}</b>')
            for attr in attributes.splitlines():
                if attr.strip():
                    parts.append(f"<span>{html.escape(attr.strip())}</span>")
            parts.append("</div>")
        parts.append('</div><p class="relations">')
        parts.append(" · ".join(f"{html.escape(a)} → {html.escape(b)}" for a, b in relationships))
        parts.append("</p></div>")
        return "".join(parts)
    if source.startswith("stateDiagram"):
        transitions = re.findall(r"^\s*([^\n:]+?)\s*-->\s*([^\n:]+?)(?::\s*([^\n]+))?$", source, re.M)
        parts = ['<div class="diagram"><div class="diagram-title">Parcours principal et transitions possibles</div>', '<div class="state-flow">']
        for index, label in enumerate(("En attente", "En course", "Terminée", "Fermée")):
            if index:
                parts.append('<span class="arrow">→</span>')
            parts.append(f'<div class="state">{label}</div>')
        parts.append('</div><div class="transitions">')
        for start, end, label in transitions:
            if start.strip() == "[*]" or end.strip() == "[*]":
                continue
            parts.append(f"<div><b>{html.escape(start.strip())} → {html.escape(end.strip())}</b> : {html.escape(label.strip())}</div>")
        parts.append("</div></div>")
        return "".join(parts)
    return f"<pre>{html.escape(source)}</pre>"


def render_markdown(source: str) -> tuple[str, str]:
    lines = source.splitlines()
    title = lines[0].removeprefix("# ").strip()
    parts: list[str] = []
    paragraph: list[str] = []
    index = 1

    def flush() -> None:
        if paragraph:
            parts.append(f"<p>{inline(' '.join(paragraph))}</p>")
            paragraph.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush()
            index += 1
            continue
        if stripped.startswith("```mermaid"):
            flush()
            index += 1
            diagram: list[str] = []
            while index < len(lines) and not lines[index].startswith("```"):
                diagram.append(lines[index])
                index += 1
            parts.append(render_mermaid("\n".join(diagram)))
            index += 1
            continue
        if stripped.startswith("## ") or stripped.startswith("### "):
            flush()
            level = 3 if stripped.startswith("### ") else 2
            parts.append(f"<h{level}>{inline(stripped[level + 1:])}</h{level}>")
            index += 1
            continue
        if stripped.startswith("|") and index + 1 < len(lines) and re.match(r"^\|[\s|:-]+\|$", lines[index + 1].strip()):
            flush()
            table_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            parts.append(render_table(table_lines))
            continue
        if re.match(r"^(?:- |\d+\. )", stripped):
            flush()
            ordered = bool(re.match(r"^\d+\. ", stripped))
            tag = "ol" if ordered else "ul"
            parts.append(f"<{tag}>")
            while index < len(lines) and re.match(r"^(?:- |\d+\. )", lines[index].strip()):
                item = re.sub(r"^(?:- |\d+\. )", "", lines[index].strip())
                parts.append(f"<li>{inline(item)}</li>")
                index += 1
            parts.append(f"</{tag}>")
            continue
        paragraph.append(stripped)
        index += 1
    flush()
    return title, "\n".join(parts)


def main() -> None:
    for markdown in DOCUMENTS:
        title, content = render_markdown(markdown.read_text(encoding="utf-8"))
        body_class = "matrix" if markdown.name.startswith("matrice-") else ""
        page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{CSS}</style></head>
        <body class="{body_class}"><header><div class="kicker">Dossier de projet · 7 octobre 2026</div><h1>{html.escape(title)}</h1></header>{content}</body></html>"""
        destination = markdown.with_suffix(".pdf")
        HTML(string=page, base_url=str(markdown.parent)).write_pdf(destination)
        print(destination.relative_to(ROOT))


if __name__ == "__main__":
    main()
