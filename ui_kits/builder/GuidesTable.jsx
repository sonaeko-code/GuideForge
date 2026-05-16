function QualityBar({ pct }) {
  let cls = "fill";
  if (pct < 70) cls = "fill low";
  else if (pct < 85) cls = "fill med";
  return (
    <div className="qbar">
      <div className="track"><div className={cls} style={{width: pct + "%"}} /></div>
      <span className="num">{pct}%</span>
    </div>
  );
}

function GuidesTable() {
  const rows = [
    { title: "Onboarding Playbook",      hub: "People Ops",   type: "Playbook",      ver: "forged",        status: "published", q: 96, u: "May 14" },
    { title: "Incident Response Runbook",hub: "Security",     type: "Runbook",       ver: "forge-verified",status: "published", q: 94, u: "May 12" },
    { title: "API Integration Guide",    hub: "Engineering",  type: "Reference",     ver: "expert-reviewed",status:"in-review", q: 82, u: "May 11" },
    { title: "Release Process Checklist",hub: "Engineering",  type: "Checklist",     ver: "reviewed",      status: "draft",     q: 68, u: "Apr 30" },
    { title: "Best Fire Warden Build",   hub: "Emberfall",    type: "Character Build", ver: "forged",      status: "published", q: 98, u: "May 14" },
    { title: "Customer Support Workflow",hub: "Support",      type: "Workflow",      ver: "community-proven", status: "published", q: 91, u: "Apr 29" },
    { title: "Patch 4.2 Impact Notes",   hub: "Emberfall",    type: "Patch Notes",   ver: "expert-reviewed", status: "needs-update", q: 76, u: "Apr 27" },
  ];

  return (
    <section data-screen-label="03 Guides Table">
      <div className="tabs">
        <a className="active">Guides<span className="count">128</span></a>
        <a>Hubs<span className="count">16</span></a>
        <a>Collections<span className="count">42</span></a>
        <a>Reviewers<span className="count">12</span></a>
        <a>Activity</a>
      </div>

      <div className="gtable">
        <div className="gtable-head">
          <div>Guide</div>
          <div>Hub</div>
          <div>Status</div>
          <div>Quality</div>
          <div>Updated</div>
          <div></div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="gtable-row">
            <div className="guide-cell">
              <div className="title">{r.title}</div>
              <div className="meta">
                <span className="b">{r.type}</span>
                <span>·</span>
                <span>{r.hub}</span>
              </div>
            </div>
            <div style={{fontSize: 13, color: "var(--fg-2)"}}>{r.hub}</div>
            <div style={{display:"flex", gap: 6, alignItems:"center", flexWrap:"wrap"}}>
              <StatusBadge status={r.status} />
              <StatusBadge status={r.ver} kind="verification" />
            </div>
            <QualityBar pct={r.q} />
            <div className="date">{r.u}</div>
            <div className="menu">⋯</div>
          </div>
        ))}
      </div>

      <div className="panels">
        <article className="panel">
          <header>
            <h3><IconStamp size={16} />Forge Rules — passing</h3>
            <a className="more">View all</a>
          </header>
          <div className="body">
            <div className="rule-row"><span className="name"><IconBoxes size={14}/>Summary section present</span><span className="ok">128 / 128</span></div>
            <div className="rule-row"><span className="name"><IconBoxes size={14}/>Prerequisites listed</span><span className="ok">122 / 128</span></div>
            <div className="rule-row"><span className="name"><IconBoxes size={14}/>Patch version tagged</span><span className="miss">96 / 128</span></div>
            <div className="rule-row"><span className="name"><IconBoxes size={14}/>Reviewer assigned</span><span className="miss">88 / 128</span></div>
            <div className="rule-row"><span className="name"><IconBoxes size={14}/>Step screenshots</span><span className="ok">115 / 128</span></div>
          </div>
        </article>

        <article className="panel">
          <header>
            <h3><IconStar size={16} />Recent activity</h3>
            <a className="more">Activity log</a>
          </header>
          <div className="body">
            <div className="activity">
              <div className="a-row">
                <div className="av">A</div>
                <div>
                  <div className="txt"><strong>Alex Forrester</strong> forged <strong>Onboarding Playbook</strong>.</div>
                  <div className="when">12 min ago</div>
                </div>
              </div>
              <div className="a-row">
                <div className="av brass">M</div>
                <div>
                  <div className="txt"><strong>Mira S.</strong> opened a review on <strong>Frostmarch Boss Mechanics</strong>.</div>
                  <div className="when">38 min ago</div>
                </div>
              </div>
              <div className="a-row">
                <div className="av teal">K</div>
                <div>
                  <div className="txt"><strong>Kenji</strong> published <strong>Patch 4.2 Impact Notes</strong> with 3 fixes.</div>
                  <div className="when">1 hr ago</div>
                </div>
              </div>
              <div className="a-row">
                <div className="av steel">J</div>
                <div>
                  <div className="txt"><strong>Jules</strong> assigned <strong>API Integration Guide</strong> to engineering review.</div>
                  <div className="when">2 hr ago</div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

// Reuse StatusBadge from marketing kit
function StatusBadge({ status, kind = "guide" }) {
  const guide = {
    "draft":        { cls: "b-draft",      lbl: "Draft" },
    "in-review":    { cls: "b-review",     lbl: "In Review" },
    "ready":        { cls: "b-rev",        lbl: "Ready" },
    "published":    { cls: "b-pub",        lbl: "Published" },
    "needs-update": { cls: "b-need",       lbl: "Needs update" },
    "deprecated":   { cls: "b-deprecated", lbl: "Deprecated" },
  };
  const verification = {
    "unverified":       { cls: "b-rev",       lbl: "Unverified" },
    "reviewed":         { cls: "b-rev",       lbl: "Reviewed" },
    "expert-reviewed":  { cls: "b-expert",    lbl: "Expert-reviewed" },
    "community-proven": { cls: "b-community", lbl: "Community-proven" },
    "forge-verified":   { cls: "b-expert",    lbl: "Forge-verified" },
    "forged":           { cls: "b-forged",    lbl: "✦ Forged" },
  };
  const map = kind === "guide" ? guide : verification;
  const m = map[status] || { cls: "b-rev", lbl: status };
  return (
    <span className={`badge ${m.cls}`}>
      {!m.lbl.startsWith("✦") && <span className="d" />}
      {m.lbl}
    </span>
  );
}

window.GuidesTable = GuidesTable;
window.QualityBar = QualityBar;
window.BuilderStatusBadge = StatusBadge;
