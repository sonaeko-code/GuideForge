function HowItWorks() {
  const steps = [
    { n: "01", t: "Pick a direction",
      b: "Gaming, repair, SOP, creator, training, or community. Each direction comes with its own opinionated Forge Rules." },
    { n: "02", t: "Generate a structured site",
      b: "Name your network, theme it, and pick a domain. GuideForge scaffolds your hubs, collections, and starter pages." },
    { n: "03", t: "Forge guides, not pages",
      b: "Use the structured editor with required sections, status, and Forge Rules baked in. No blank canvas." },
    { n: "04", t: "Publish, export, or embed",
      b: "Ship to a hosted, branded guide page — or export and embed your guides anywhere your readers are." },
  ];

  return (
    <section id="how" className="section" data-screen-label="03 How it Works">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2>From idea to a hosted, exportable guide network.</h2>
        </div>
        <ol className="grid-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {steps.map(s => (
            <li key={s.n} className="step-card">
              <div className="n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

window.HowItWorks = HowItWorks;
