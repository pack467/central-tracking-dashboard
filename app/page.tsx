"use client";

import { useEffect, useMemo, useState } from "react";

type Tone = "critical" | "warning" | "success" | "neutral" | "info";

const projects = [
  { name: "SM", status: "attention", detail: "1 exception", tone: "warning" as Tone },
  { name: "B2B", status: "attention", detail: "Kafka check", tone: "warning" as Tone },
  { name: "USIEM", status: "healthy", detail: "All checks passed", tone: "success" as Tone },
  { name: "MB", status: "healthy", detail: "All checks passed", tone: "success" as Tone },
  { name: "EPC", status: "healthy", detail: "All checks passed", tone: "success" as Tone },
  { name: "DM", status: "healthy", detail: "All checks passed", tone: "success" as Tone },
  { name: "UNEM", status: "healthy", detail: "All checks passed", tone: "success" as Tone },
];

const attentionItems = [
  {
    project: "SM",
    title: "ActiveMQ 228 queue requires validation",
    note: "Queue accumulation was reported at the 18:00 checkpoint. No owner acknowledgement yet.",
    time: "4h ago",
    tone: "warning" as Tone,
    tag: "Queue",
  },
  {
    project: "B2B",
    title: "Message flow absent on b2b-f… topic",
    note: "Detected during Kafka UI validation. Verify producer health before next checkpoint.",
    time: "4h ago",
    tone: "warning" as Tone,
    tag: "Kafka",
  },
  {
    project: "EPC Tools",
    title: "One ad-hoc request remains in progress",
    note: "Review the approval entities task before shift handover.",
    time: "1h ago",
    tone: "info" as Tone,
    tag: "Ticket",
  },
];

const monitoring = [
  { time: "21:00", project: "B2B", task: "Kafka topic traffic", owner: "M. Ihsanul Arifin", state: "Attention", tone: "warning" as Tone },
  { time: "21:00", project: "DM", task: "Grafana CPU utilization", owner: "M. Ihsanul Arifin", state: "Completed", tone: "success" as Tone },
  { time: "22:00", project: "SM", task: "ActiveMQ queues 228 · 71 · 68", owner: "M. Ihsanul Arifin", state: "Attention", tone: "warning" as Tone },
  { time: "22:00", project: "USIEM", task: "Graylog & SIEM dashboard", owner: "M. Ihsanul Arifin", state: "Completed", tone: "success" as Tone },
  { time: "22:00", project: "EPC Core", task: "Catalog service status", owner: "M. Ihsanul Arifin", state: "Completed", tone: "success" as Tone },
  { time: "22:00", project: "UNEM", task: "Grafana service & alerts", owner: "M. Ihsanul Arifin", state: "Completed", tone: "success" as Tone },
  { time: "23:00", project: "Handover", task: "Night-shift readiness review", owner: "Night shift", state: "Upcoming", tone: "neutral" as Tone },
];

const tickets = [
  { id: "86d4054rh", subject: "[EPC Tools] Add new parameter for FMC", project: "EPC Tools", severity: "Low", owner: "Pangondion Kurniawan", status: "Activity", created: "21:00" },
  { id: "86d40eqn1", subject: "[EPC Tools] Approval entities validation", project: "EPC Tools", severity: "Low", owner: "Pangondion Kurniawan", status: "Closed", created: "20:08" },
  { id: "86d40cxuk", subject: "[SM] Transfer LTE buffer files", project: "SM", severity: "Low", owner: "Mhd. Galih Khairi", status: "Closed", created: "18:20" },
  { id: "86d40b9yh", subject: "[USIEM] Restart SIEM log gateway", project: "USIEM", severity: "Low", owner: "Mhd. Galih Khairi", status: "Closed", created: "16:29" },
  { id: "86d40bebu", subject: "[MB] Push notification events", project: "MB", severity: "Low", owner: "Mhd. Galih Khairi", status: "Closed", created: "16:21" },
];

const navItems = [
  ["⌂", "Main"],
  ["◫", "Tickets"],
  ["◷", "Monitoring"],
  ["≡", "Shift log"],
  ["▦", "Reports"],
];

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function ProjectMark({ name }: { name: string }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2);
  return <span className={`project-mark project-${name.toLowerCase().replace(/[^a-z]/g, "")}`}>{initials}</span>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Main");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All checks");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setTicketOpen(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const visibleMonitoring = useMemo(() => {
    if (selectedFilter === "Needs attention") return monitoring.filter((item) => item.tone === "warning");
    if (selectedFilter === "Upcoming") return monitoring.filter((item) => item.state === "Upcoming");
    return monitoring;
  }, [selectedFilter]);

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter((ticket) => Object.values(ticket).some((value) => value.toLowerCase().includes(needle)));
  }, [search]);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3400);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="brand-symbol"><i /><i /><i /></span>
          <span><strong>Central</strong><small>TRACKING DASHBOARD</small></span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(([icon, label]) => (
            <button
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              key={label}
              onClick={() => {
                setActiveNav(label);
                if (label !== "Main") announce(`${label} workspace is ready to connect.`);
              }}
            >
              <span className="nav-icon">{icon}</span>{label}
              {label === "Tickets" && <span className="nav-count">1</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-label sidebar-label-lower">OPERATIONS</div>
        <nav className="nav-list">
          <button className="nav-item" onClick={() => announce("Escalation matrix opened.")}><span className="nav-icon">↗</span>Escalations</button>
          <button className="nav-item" onClick={() => announce("Knowledge base opened.")}><span className="nav-icon">◇</span>Runbooks</button>
          <button className="nav-item" onClick={() => announce("Team roster opened.")}><span className="nav-icon">◎</span>Team roster</button>
        </nav>

        <section className="shift-card">
          <div className="shift-card-top"><span className="live-dot" /> LIVE SHIFT</div>
          <strong>Afternoon shift</strong>
          <p>13:00 – 22:59 WIB</p>
          <div className="shift-people"><span>GK</span><span>KM</span><span>MI</span><span className="more">+2</span></div>
          <button onClick={() => announce("Shift handover checklist opened.")}>Prepare handover <span>→</span></button>
        </section>

        <button className="profile" onClick={() => announce("Profile menu opened.")}>
          <span className="profile-avatar">GK</span>
          <span><strong>Galih Khairi</strong><small>NOC Operator</small></span>
          <span className="profile-more">•••</span>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs"><span>Operations</span><b>/</b><strong>Main dashboard</strong></div>
          <div className="topbar-actions">
            <button className="command-button" onClick={() => setSearchOpen(true)} aria-label="Search dashboard">
              <span>⌕</span><em>Search or jump to…</em><kbd>⌘ K</kbd>
            </button>
            <button className="icon-button notification-button" onClick={() => announce("You have 3 active operational notifications.")} aria-label="Notifications">♧<i>3</i></button>
            <button className="date-button" onClick={() => announce("Date range selector opened.")}><span>◷</span> Tue, 11 Aug 2026 <b>⌄</b></button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> SYSTEM STATUS UPDATED 22:12 WIB</div>
              <h1>Operations command center</h1>
              <p>One view of your queue, scheduled checks, and the conditions requiring a decision.</p>
            </div>
            <div className="page-actions">
              <button className="button button-secondary" onClick={() => announce("Daily operational summary exported.")}><span>↓</span> Export summary</button>
              <button className="button button-primary" onClick={() => setTicketOpen(true)}><span>＋</span> New ticket</button>
            </div>
          </section>

          <section className="health-strip" aria-label="Service health by project">
            <div className="health-intro">
              <span className="health-title">Service health</span>
              <Badge tone="success">5 healthy</Badge>
              <Badge tone="warning">2 attention</Badge>
            </div>
            <div className="project-pills">
              {projects.map((project) => (
                <button className="project-pill" key={project.name} onClick={() => announce(`${project.name}: ${project.detail}`)}>
                  <ProjectMark name={project.name} />
                  <span><strong>{project.name}</strong><small>{project.detail}</small></span>
                  <i className={`status-dot ${project.tone}`} />
                </button>
              ))}
            </div>
          </section>

          <section className="metrics-grid" aria-label="Operational snapshot">
            <article className="metric-card metric-health">
              <div className="metric-top"><span>CHECKPOINT SUCCESS</span><Badge tone="success">+2.1% vs yesterday</Badge></div>
              <div className="metric-number">94<span>%</span></div>
              <p>128 of 136 scheduled monitoring checks completed successfully.</p>
              <div className="progress-line"><i style={{ width: "94%" }} /></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>OPEN TICKETS</span><button onClick={() => setActiveNav("Tickets")}>View queue →</button></div>
              <div className="metric-number">1</div>
              <div className="metric-foot"><Badge tone="warning">1 activity</Badge><span>4 closed today</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>REQUIRES ATTENTION</span><Badge tone="warning">Needs review</Badge></div>
              <div className="metric-number">3</div>
              <div className="metric-foot"><span className="bullet-orange">●</span><span>2 monitoring exceptions</span></div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>NEXT CHECKPOINT</span><button onClick={() => announce("Monitoring schedule opened.")}>Schedule →</button></div>
              <div className="metric-time">23:00 <small>WIB</small></div>
              <div className="metric-foot"><span className="bullet-blue">●</span><span>Night-shift readiness review</span></div>
            </article>
          </section>

          <section className="dashboard-grid">
            <div className="main-column">
              <article className="panel attention-panel">
                <div className="panel-heading">
                  <div><div className="panel-title"><span className="attention-icon">!</span> Requires attention <Badge tone="warning">3</Badge></div><p>Exceptions and work that need an owner before handover.</p></div>
                  <button className="text-button" onClick={() => announce("All active exceptions displayed.")}>View all <span>→</span></button>
                </div>
                <div className="attention-list">
                  {attentionItems.map((item) => {
                    const isAcknowledged = acknowledged.includes(item.title);
                    return <div className={`attention-row ${isAcknowledged ? "resolved" : ""}`} key={item.title}>
                      <ProjectMark name={item.project} />
                      <div className="attention-copy"><div><Badge tone={item.tone}>{item.tag}</Badge><span className="attention-time">{item.time}</span></div><strong>{item.title}</strong><p>{isAcknowledged ? "Acknowledged — waiting for the next validation update." : item.note}</p></div>
                      <button className="ack-button" onClick={() => setAcknowledged((current) => current.includes(item.title) ? current : [...current, item.title])}>{isAcknowledged ? "Acknowledged" : "Acknowledge"}</button>
                    </div>;
                  })}
                </div>
              </article>

              <article className="panel schedule-panel">
                <div className="panel-heading schedule-heading">
                  <div><div className="panel-title">Monitoring schedule</div><p>Today’s completed, active, and upcoming checkpoints.</p></div>
                  <div className="filter-tabs" aria-label="Monitoring filters">
                    {["All checks", "Needs attention", "Upcoming"].map((filter) => <button key={filter} className={selectedFilter === filter ? "selected" : ""} onClick={() => setSelectedFilter(filter)}>{filter}</button>)}
                  </div>
                </div>
                <div className="schedule-table" role="table" aria-label="Monitoring schedule">
                  <div className="schedule-header" role="row"><span>TIME</span><span>CHECKPOINT</span><span>ASSIGNED TO</span><span>STATUS</span></div>
                  {visibleMonitoring.map((item) => <div className={`schedule-row ${item.time === "22:00" ? "current-hour" : ""}`} role="row" key={`${item.time}-${item.project}-${item.task}`}>
                    <span className="schedule-time">{item.time}{item.time === "22:00" && <small>NOW</small>}</span>
                    <span className="schedule-check"><ProjectMark name={item.project} /><span><strong>{item.project}</strong><small>{item.task}</small></span></span>
                    <span className="schedule-owner"><span className="mini-avatar">{item.owner.split(" ").map((word) => word[0]).join("").slice(0,2)}</span>{item.owner}</span>
                    <span><Badge tone={item.tone}>{item.state}</Badge></span>
                  </div>)}
                  {visibleMonitoring.length === 0 && <div className="schedule-empty">No checks match this view.</div>}
                </div>
                <button className="full-width-button" onClick={() => announce("Full monitoring schedule opened.")}>Open full monitoring schedule <span>→</span></button>
              </article>
            </div>

            <aside className="side-column">
              <article className="panel coverage-panel">
                <div className="panel-title">Shift coverage</div>
                <p className="coverage-subtitle">Afternoon shift · 13:00 – 22:59</p>
                <div className="coverage-ring"><div><strong>5</strong><span>ONLINE</span></div></div>
                <div className="coverage-stats"><span><i className="status-dot success" /> 5 online</span><span><i className="status-dot neutral" /> 1 on break</span></div>
                <div className="coverage-team">
                  {["Mhd. Galih Khairi", "Kristina Marbun", "M. Ihsanul Arifin"].map((member, index) => <button key={member} onClick={() => announce(`${member} is on afternoon shift.`)}><span className={`avatar avatar-${index}`}>{member.split(" ").map((word) => word[0]).join("").slice(0,2)}</span><span>{member}<small>{index === 0 ? "Coordinator" : "Operator"}</small></span><i className="status-dot success" /></button>)}
                </div>
                <button className="full-width-button" onClick={() => announce("Full shift roster opened.")}>View shift roster <span>→</span></button>
              </article>

              <article className="panel handover-panel">
                <div className="handover-label"><span>⊙</span> HANDOVER READINESS</div>
                <strong>2 items need a note</strong>
                <p>Document the SM queue and B2B Kafka exceptions for the night team.</p>
                <div className="handover-progress"><span>4 of 6 complete</span><i><b /></i></div>
                <button onClick={() => announce("Handover checklist opened.")}>Continue handover <span>→</span></button>
              </article>
            </aside>
          </section>

          <article className="panel tickets-panel">
            <div className="panel-heading"><div><div className="panel-title">Recent ticket activity</div><p>Latest handling tasks, requests, and incident work from today.</p></div><button className="text-button" onClick={() => setActiveNav("Tickets")}>Open ticket queue <span>→</span></button></div>
            <div className="ticket-table" role="table" aria-label="Recent ticket activity">
              <div className="ticket-header" role="row"><span>TICKET</span><span>PROJECT</span><span>ASSIGNED TO</span><span>SEVERITY</span><span>STATUS</span><span>CREATED</span></div>
              {tickets.map((ticket) => <button className="ticket-row" role="row" onClick={() => announce(`Ticket ${ticket.id} selected.`)} key={ticket.id}>
                <span className="ticket-subject"><strong>{ticket.subject}</strong><small>#{ticket.id}</small></span><span><ProjectMark name={ticket.project} /> {ticket.project}</span><span className="ticket-owner"><span className="mini-avatar">{ticket.owner.split(" ").map((word) => word[0]).join("").slice(0,2)}</span>{ticket.owner}</span><span><Badge tone={ticket.severity === "Low" ? "neutral" : "warning"}>{ticket.severity}</Badge></span><span><Badge tone={ticket.status === "Closed" ? "success" : "info"}>{ticket.status}</Badge></span><span className="created-time">{ticket.created}</span>
              </button>)}
            </div>
          </article>
        </div>
      </section>

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}

      {searchOpen && <div className="modal-backdrop" onMouseDown={() => setSearchOpen(false)}>
        <section className="command-modal" role="dialog" aria-modal="true" aria-label="Search dashboard" onMouseDown={(event) => event.stopPropagation()}>
          <div className="command-input"><span>⌕</span><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets, services, or people…" /><kbd>ESC</kbd></div>
          <div className="command-section-label">RECENT TICKETS</div>
          <div className="command-results">
            {filteredTickets.slice(0, 4).map((ticket) => <button key={ticket.id} onClick={() => { setSearchOpen(false); announce(`Opened ticket ${ticket.id}.`); }}><ProjectMark name={ticket.project} /><span><strong>{ticket.subject}</strong><small>#{ticket.id} · {ticket.owner}</small></span><Badge tone={ticket.status === "Closed" ? "success" : "info"}>{ticket.status}</Badge></button>)}
          </div>
          <div className="command-footer"><span><kbd>↵</kbd> Open</span><span><kbd>↑↓</kbd> Navigate</span><span><kbd>ESC</kbd> Close</span></div>
        </section>
      </div>}

      {ticketOpen && <div className="modal-backdrop" onMouseDown={() => setTicketOpen(false)}>
        <section className="ticket-modal" role="dialog" aria-modal="true" aria-label="Create a new ticket" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-title"><span><strong>New ticket</strong><small>Create a tracked NOC task or incident.</small></span><button onClick={() => setTicketOpen(false)} aria-label="Close">×</button></div>
          <label>Subject<input placeholder="Briefly describe the work or incident" /></label>
          <div className="two-inputs"><label>Project<select defaultValue="SM"><option>SM</option><option>B2B</option><option>USIEM</option><option>MB</option><option>EPC Tools</option></select></label><label>Severity<select defaultValue="Low"><option>Low</option><option>Medium</option><option>High</option></select></label></div>
          <label>Initial note<textarea placeholder="What was observed and what action is needed?" rows={4} /></label>
          <div className="modal-actions"><button className="button button-secondary" onClick={() => setTicketOpen(false)}>Cancel</button><button className="button button-primary" onClick={() => { setTicketOpen(false); announce("Ticket draft created and assigned to your queue."); }}>Create ticket</button></div>
        </section>
      </div>}
    </main>
  );
}
