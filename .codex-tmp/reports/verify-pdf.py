from pathlib import Path
import csv
import re
from pypdf import PdfReader
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[2]
outputs = root / "frontend/.report-qa"
previews = Path(__file__).parent
normalize = lambda value: re.sub(r"\s+", "", value)
sections = ["A. TUJUAN", "B. RUANG LINGKUP PEKERJAAN", "C. RINGKASAN AKTIVITAS", "1. Overview", "a. Tiket minggu ini berdasarkan project", "b. Tiket minggu ini hari per hari berdasarkan project", "c. Rata-rata durasi pemerosesan tiket berdasarkan project", "d. Tiket minggu ini berdasarkan kategori di setiap project", "e. Total tiket monitoring hari per hari dalam minggu ini berdasarkan project", "2. Ticket log / Tiket di minggu ini", "3. Monitoring Log", "DISUSUN OLEH", "DISETUJUI OLEH"]
ticket_columns = ["Ticket", "Date Created", "Subject", "Project", "Deskripsi Tugas (Reason # Action # Resp. Time)", "Date Closed", "Status", "Agent", "Category"]
monitoring_columns = ["Date", "Project", "Check Point", "Agent Assigned", "List Activity Monitoring", "Result dan Noted", "New Update (hh:mm)"]

for name in ["empty", "sample", "filtered", "long-note"]:
    reader = PdfReader(outputs / f"{name}.pdf")
    texts = [normalize(page.extract_text()) for page in reader.pages]
    text = "".join(texts)
    positions = [text.index(normalize(section)) for section in sections]
    assert positions == sorted(positions), (name, "section order")
    for page, content in zip(reader.pages, texts):
        assert float(page.mediabox.width) == 595.44
        assert float(page.mediabox.height) == 841.68
        assert "Week35–2026|25Agu2026–31Agu2026" in content
    assert normalize("31 Agustus 2026") in texts[-1]
    assert "25Desember2026" not in text
    for cols in [ticket_columns, monitoring_columns]:
        assert normalize("".join(cols)) in text, (name, "column schema")
    categories = text[positions[7]:positions[8]]
    assert "Severity-CategoryGrandTotal" in categories
    assert "MB" not in categories and "SM" not in categories
    if name == "empty":
        assert text.count(normalize("Tidak ada tiket pada periode ini")) == 2
        assert text.count(normalize("Tidak ada data pada periode ini.")) == 2
        assert "Totaltiketmingguini:0" in text
    if name == "filtered":
        assert "SingleMediation" in texts[0] and "MessageBroker" not in texts[0]
    if name == "sample":
        for value in ["Line;oneSecondline", "No measurement", "Queue", "Stabil"]:
            assert normalize(value) in text
    if name == "long-note":
        # The repeated table headers interrupt words at page boundaries. Extract
        # only body fragments at the description column's actual text origin.
        fragments = []
        def collect(value, cm, tm, font, size):
            if 278 < tm[4] < 280 and re.fullmatch(r"[VeryLongText\s]+", value):
                fragments.append(normalize(value))
        for page in reader.pages:
            page.extract_text(visitor_text=collect)
        assert "".join(fragments) == "VeryLongText" * 650
    pdf = pdfium.PdfDocument(outputs / f"{name}.pdf")
    first_header = None
    for number, page in enumerate(pdf):
        bitmap = page.render(scale=1.5)
        rendered = bitmap.to_pil()
        header = rendered.crop((0, 0, 893, 185)).tobytes()
        if first_header is None:
            first_header = header
        assert header == first_header, (name, number + 1, "header differs")
        rendered.save(previews / f"{name}-verified-{number+1}.png")
    print(f"PASS {name}: {len(reader.pages)} A4 pages, ordered sections, exact table schemas, header/footer, complete text")

for name, columns in [("ticket-log", ticket_columns), ("monitoring-log", monitoring_columns)]:
    with (outputs / f"{name}.csv").open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.reader(file, delimiter=";"))
    assert rows[0] == columns
    assert all(len(row) == len(columns) for row in rows)
    print(f"PASS {name}.csv: {len(columns)} columns, {len(rows)-1} records")
