function LandingHero() {
  return (
    <section className="hero" data-screen-label="01 Hero">
      <div className="container hero-inner">
        <span className="eyebrow-pill">
          <IconZap size={14} stroke={1.5} className="ember" style={{color: "var(--gf-ember)"}} />
          Forge structured knowledge
        </span>
        <h1>Forge structured guides<br /><em>from rough ideas.</em></h1>
        <p>
          GuideForge helps you turn messy notes, workflows, tutorials, and plans
          into organized guides, checklists, and knowledge networks — ready to
          edit, reuse, and grow.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg">
            Start building
            <IconArrowRight size={16} />
          </button>
          <button className="btn btn-ghost btn-lg">See an example</button>
        </div>
        <dl className="hero-stats">
          <div>
            <dt>Transform</dt>
            <dd>Rough idea → Structured draft</dd>
          </div>
          <div>
            <dt>Asset types</dt>
            <dd>Guides, Checklists, Networks</dd>
          </div>
          <div>
            <dt>Ownership</dt>
            <dd>Edit, reuse, grow together</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

window.LandingHero = LandingHero;
