function WhatItBuilds() {
  const items = [
    { Icon: IconNetwork, title: "Networks",
      desc: "Top-level brands like QuestLine. Each network has its own theme, domain, and ruleset." },
    { Icon: IconLayers, title: "Hubs",
      desc: "A game, product line, department, or topic inside a network. Hubs hold collections." },
    { Icon: IconBoxes, title: "Collections",
      desc: "Curated groupings like Character Builds, Boss Guides, or Onboarding SOPs." },
    { Icon: IconFile, title: "Guides & Steps",
      desc: "Structured guides made of typed sections. Forge Rules keep them consistent." },
  ];

  return (
    <section id="what" className="section alt" data-screen-label="02 What it Builds">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">What GuideForge creates</span>
          <h2>A structured guide world — already wired up for you.</h2>
          <p>
            You don't design a site. You compose a guide world from real primitives.
            Every level is opinionated, so what ships stays clean — and stays exportable,
            embeddable, and hostable from day one.
          </p>
        </div>
        <div className="grid-4">
          {items.map(({ Icon: I, title, desc }) => (
            <article key={title} className="section-card">
              <div className="ico"><I size={18} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

window.WhatItBuilds = WhatItBuilds;
