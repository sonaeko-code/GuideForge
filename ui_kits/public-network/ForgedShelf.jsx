function ForgedShelf() {
  const items = [
    { hub: "Emberfall",     title: "Best Fire Warden Beginner Build",      v: "4.2" },
    { hub: "Hollowspire",   title: "Hollow Choir Boss Mechanics — full",   v: "1.8" },
    { hub: "Starfall",      title: "Outrider Bounty PvP Reference",        v: "1.5" },
    { hub: "Emberfall",     title: "Frostmarch Boss Mechanics",            v: "4.2" },
  ];

  return (
    <section className="sec" data-screen-label="04 Forged Shelf">
      <div className="container">
        <div className="sec-head">
          <div>
            <span className="sec-eyebrow">
              <IconStamp size={12} />
              The Forged shelf
            </span>
            <h2>Guides that passed every editorial check</h2>
          </div>
        </div>
        <p style={{maxWidth: 640, fontSize: 14.5, lineHeight: 1.6, color: "var(--fg-3)", marginTop: -18, marginBottom: 26}}>
          Forged guides are written, peer-reviewed, and re-tested against the
          current patch. They're held to the highest editorial bar on the network.
        </p>
        <div className="shelf">
          {items.map((it, i) => (
            <article key={i} className="item">
              <div className="badge-line"><IconStar size={11} /> Forged</div>
              <div className="hub">{it.hub}</div>
              <h4>{it.title}</h4>
              <p>Phase breakdown, gear targets, and step-by-step preparation for the run.</p>
              <div className="foot"><span>v{it.v}</span><IconArrowRight size={12} /></div>
            </article>
          ))}
        </div>
      </div>

      <footer className="pub-foot" data-screen-label="05 Footer" style={{marginTop: 56, padding: "36px 0 0"}}>
        <div className="pub-foot-inner">
          <div>
            <strong>QuestLine</strong> — an editorial guide network forged on
            <span style={{margin: "0 4px", color: "var(--gf-copper)"}}>GuideForge</span>
          </div>
          <div className="by">Network → Hub → Collection → Guide → Step</div>
        </div>
      </footer>
    </section>
  );
}

window.ForgedShelf = ForgedShelf;
