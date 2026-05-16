function ExampleNetworks() {
  const items = [
    { Icon: IconGamepad,  name: "QuestLine", type: "Gaming Guide Network",
      blurb: "Builds, beginner paths, raid mechanics, and patch coverage across multiple games.",
      featured: true },
    { Icon: IconWrench,   name: "FieldFix",  type: "Repair / Support Platform",
      blurb: "Procedural repair guides with safety callouts, model targeting, and revision history." },
    { Icon: IconLifeBuoy, name: "Runbook",   type: "Business SOP Portal",
      blurb: "Process owners, revision numbers, and structured SOPs your team will actually follow." },
    { Icon: IconGrad,     name: "Atlas",     type: "Training Library",
      blurb: "Curriculum-shaped collections, module guides, and audience targeting." },
    { Icon: IconUsers,    name: "Commons",   type: "Community Knowledge Base",
      blurb: "Structured community guides with trust tiers and contributor credit." },
  ];

  return (
    <section id="examples" className="section alt" data-screen-label="04 Example Networks">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Example Networks</span>
          <h2>One engine. Many network types.</h2>
          <p>
            The first live demo is a gaming network. The same engine powers repair,
            SOP, training, creator, and community networks — coming next.
          </p>
        </div>
        <div className="grid-3">
          {items.map(({ Icon: I, name, type, blurb, featured }) => (
            <article key={name} className={`net-card ${featured ? "featured" : ""}`}>
              <div className="top">
                <div className="ico"><I size={18} /></div>
                <span className={`pill ${featured ? "live" : ""}`}>
                  {featured ? "Live demo" : "Coming next"}
                </span>
              </div>
              <div>
                <h3>{name}</h3>
                <div className="type">{type}</div>
              </div>
              <p>{blurb}</p>
              {featured && (
                <a className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", padding: 0 }}>
                  Explore <IconArrowRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

window.ExampleNetworks = ExampleNetworks;
