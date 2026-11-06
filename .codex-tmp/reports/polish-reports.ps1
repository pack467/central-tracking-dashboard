$reportPath = Join-Path $PSScriptRoot '../../frontend/app/components/views/ReportsView.tsx'
$reportSource = Get-Content -LiteralPath $reportPath -Raw
$reportSource = $reportSource.Replace('<button type="button" className={buttonClass} onClick={() => void exportCsv()} disabled={busy || Boolean(validation)}><ArrowDownToLine size={14} />Ekspor CSV</button>', '<ReportCsvExport disabled={busy || Boolean(validation)} onExport={exportCsv} />')
$reportSource = $reportSource.Replace('<div className="space-y-5">', '<div className="min-w-0 space-y-5 pb-6 sm:space-y-6">')
$reportSource = $reportSource.Replace('rounded-lg bg-accent-blue px-5', 'rounded-xl border border-accent-blue bg-accent-blue shadow-[0_0_24px_rgba(56,189,248,0.12)] px-4')
$reportSource = $reportSource.Replace('text-[10px]', 'text-[11px]').Replace('text-[9px]', 'text-[11px]')
$reportSource = $reportSource.Replace('lg:grid-cols-[1fr_1fr_1.15fr_auto]', 'xl:grid-cols-[1fr_1fr_1.15fr_auto]')
$reportSource = $reportSource.Replace('className="flex overflow-x-auto"', 'className="flex min-w-0 overflow-x-auto"')
$reportSource = $reportSource.Replace('className="flex flex-col gap-3 border-b', 'className="flex min-w-0 flex-col gap-3 border-b')
$reportSource = $reportSource.Replace('className="space-y-5">', 'className="space-y-5 sm:space-y-6">')
$reportSource = $reportSource.Replace('<EmptyReport monitoring={tab === "monitoring"} />', '<EmptyReport kind={tab === "monitoring" ? "monitoringLog" : "tickets"} />')
$reportSource = $reportSource.Replace('<span className="block text-xs text-ink-muted">Tanggal dokumen</span><input className={inputClass} type="date" disabled={busy} value={identity.date} onInput={(event) => setSignedDate(event.currentTarget.value)} />', '<span className="block text-xs text-ink-muted">Tanggal persetujuan</span><p className="rounded-xl border border-line/60 bg-dashboard-bg/30 px-3 py-3 text-xs text-ink-secondary">{formatReportDate(period.end)}</p>')
$reportSource = $reportSource.Replace('Kolom tanda tangan tersedia untuk laporan baru. Isi dokumen asli tetap tersedia melalui tombol PDF dokumen asli.', 'Tanggal persetujuan mengikuti tanggal selesai. Garis tanda tangan kosong tersedia pada halaman penutup.')

$statsStart = $reportSource.IndexOf('    <section className="grid grid-cols-2')
$statsEnd = $reportSource.IndexOf('    <section className="flex min-w-0 flex-col', $statsStart)
$stats = @'
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Ringkasan laporan">
      {stats.map((stat) => <article key={stat.title} className={`${panelClass} flex flex-col p-4 transition hover:border-accent-blue-border last:col-span-2 md:last:col-span-1 sm:p-5`}>
        <div className="flex items-start justify-between gap-2"><span className="text-[11px] font-medium leading-4 text-ink-muted">{stat.title}</span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line/60 bg-dashboard-bg/35 ${stat.tone}`}><stat.icon size={14} /></span></div>
        <strong className="mt-3 block text-3xl font-bold leading-none tracking-tight text-ink-primary">{stat.value}</strong>
        <p className="mt-2 min-h-8 text-[11px] leading-4 text-ink-muted">{stat.caption}</p>
      </article>)}
    </section>

'@
$reportSource = $reportSource.Remove($statsStart, $statsEnd - $statsStart).Insert($statsStart, $stats)

$summaryStart = $reportSource.IndexOf('      {tab === "summary" &&')
$summaryEnd = $reportSource.IndexOf('      {(tab === "tickets"', $summaryStart)
$summary = @'
      {tab === "summary" && <>
        <div className="grid gap-5 lg:grid-cols-2 sm:gap-6">
          <Panel title="Tiket berdasarkan proyek" note={`${report.total} tiket`}><ProjectChart report={report} /></Panel>
          <Panel title="Aktivitas tiket harian" note="Distribusi per proyek"><DailyChart report={report} /></Panel>
        </div>
        <Panel title="Durasi pemrosesan & SLA">
          <DataTable headers={REPORT_DURATION_COLUMNS} total rows={[...report.projects.map((row) => [row.project, formatDuration(row.averageMinutes), row.slaPercent === null ? "—" : `${row.slaPercent}%`, row.total, "—"]), ["Grand Total", formatDuration(report.averageMinutes), report.slaPercent === null ? "—" : `${report.slaPercent}%`, report.total, "—"]]} />
          <p className="border-t border-line/60 px-4 py-3 text-[11px] leading-5 text-ink-muted sm:px-5">{REPORT_DURATION_NOTE}</p>
        </Panel>
        <div className="grid gap-5 lg:grid-cols-2 sm:gap-6">
          <Panel title="Kategori tiket" note="Severity & category">{report.categories.length ? <DataTable headers={["Severity - Category", "Grand Total"]} total rows={[...report.categories.map((row) => [row.category, row.total]), ["Grand Total", report.total]]} /> : <EmptyReport kind="categories" compact />}</Panel>
          <Panel title="Ringkasan monitoring" note={`${report.monitoring.length} catatan`}>{report.monitoringCounts.length ? <DataTable headers={["Project", "Count of Agent"]} total rows={[...report.monitoringCounts.map((row) => [row.project, row.count]), ["Grand Total", report.monitoring.length]]} /> : <EmptyReport kind="monitoring" compact />}</Panel>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] leading-5 text-ink-muted"><span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-accent-blue" />Data sesuai klien, periode, dan proyek terpilih.</span><span>{handoverCount} catatan handover di dashboard</span></div>
      </>}

'@
$reportSource = $reportSource.Remove($summaryStart, $summaryEnd - $summaryStart).Insert($summaryStart, $summary)

$heroStart = $reportSource.IndexOf('    <section className={`${panelClass} relative`}')
$heroEnd = $reportSource.IndexOf('    <section className={panelClass}', $heroStart)
$hero = @'
    <section className={`${panelClass} relative bg-linear-to-br from-accent-blue-soft via-panel-bg/70 to-panel-bg/50`} aria-label="Template laporan">
      <div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-accent-blue/5 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent-blue-border bg-accent-blue-soft text-accent-blue"><FileText size={20} /></span>
          <div className="min-w-0"><p className="text-[11px] font-semibold tracking-wide text-accent-blue">TEMPLATE HUTABYTE <span className="ml-1.5 font-mono font-normal text-ink-muted">A4 · REV. 00</span></p><h2 className="mt-1.5 text-sm font-semibold text-ink-primary">Laporan Serah Terima Kerja</h2><p className="mt-1 text-xs leading-5 text-ink-muted">IT Maintenance Support · Periode, grafik, dan log mengikuti filter laporan.</p></div>
        </div>
        <a href={REPORT_REFERENCE_URL} download="[2026-39] Laporan Serah Terima Kerja Mingguan.pdf" className={`${buttonClass} shrink-0 self-start sm:self-center`}><FileCheck2 size={15} />PDF dokumen asli<ArrowDownToLine size={13} /></a>
      </div>
    </section>

'@
$reportSource = $reportSource.Remove($heroStart, $heroEnd - $heroStart).Insert($heroStart, $hero)
[System.IO.File]::WriteAllText($reportPath, $reportSource.TrimEnd() + [Environment]::NewLine)
