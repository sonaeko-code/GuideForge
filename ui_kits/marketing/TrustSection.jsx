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
    "unverified":       { cls: "b-rev",      lbl: "Unverified" },
    "reviewed":         { cls: "b-rev",      lbl: "Reviewed" },
    "expert-reviewed":  { cls: "b-expert",   lbl: "Expert-reviewed" },
    "community-proven": { cls: "b-community",lbl: "Community-proven" },
    "forge-verified":   { cls: "b-expert",   lbl: "Forge-verified" },
    "forged":           { cls: "b-forged",   lbl: "✦ Forged" },
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

function TrustSection() {
  const rows = [
    { title: "Best Fire Warden Beginner Build", status: "published",   ver: "forged" },
    { title: "Frostmarch Boss Mechanics",       status: "in-review",   ver: "expert-reviewed" },
    { title: "Patch 4.2 Impact Notes",          status: "needs-update", ver: "community-proven" },
    { title: "Patch 3.8 Class Tier List",       status: "deprecated",  ver: "reviewed" },
  ];

  return (
    <section id="trust" className="section" data-screen-label="05 Trust">
      <div className="container grid-2">
        <div>
          <span className="eyebrow">Trust &amp; status</span>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 38, letterSpacing: "-0.02em", lineHeight: 1.08, margin: "0 0 18px", textWrap: "balance" }}>
            Readers should know how trustworthy a guide is — at a glance.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--fg-3)", marginBottom: 14 }}>
            Every guide carries a lifecycle status and a trust tier. Drafts are
            clearly marked. Reviewed and Expert-reviewed guides earn their badges.
            Forge-verified means the guide passes its network's required Forge
            Rules. <strong style={{ color: "var(--fg-1)" }}>Forged</strong> is reserved
            for the highest-trust guides — fully vetted and stamped.
          </p>
          <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0 }}>
            The trust engine ships in a later release. The visual language is
            wired in from day one.
          </p>
        </div>
        <div className="trust-list">
          <h4><IconStamp size={16} style={{color: "var(--gf-copper)"}} />Sample status surface</h4>
          {rows.map(r => (
            <div key={r.title} className="row">
              <span className="title">{r.title}</span>
              <span className="badges">
                <StatusBadge status={r.status} />
                <StatusBadge status={r.ver} kind="verification" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.TrustSection = TrustSection;
window.StatusBadge = StatusBadge;
