function CtaFooter() {
  return (
    <>
      <section className="cta-section" data-screen-label="06 CTA">
        <div className="container">
          <div className="cta-box">
            <h2>Ready to forge your first guide world?</h2>
            <p>
              Pick a direction, create a network, and ship a hosted guide site
              your readers will actually trust — then export and embed when
              you're ready.
            </p>
            <button className="btn btn-primary btn-lg">
              Start building
              <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="gf-footer" data-screen-label="07 Footer">
        <div className="container gf-footer-inner">
          <div className="brand-mini">
            <span className="gf-seal" style={{ width: 26, height: 26, borderRadius: 6 }}>
              <GuideMark size={12} />
            </span>
            <strong>GuideForge</strong>
            <span>— guide worlds, sites, and embeds</span>
          </div>
          <div className="breadcrumb">
            Network → Hub → Collection → Guide → Step
          </div>
        </div>
      </footer>
    </>
  );
}

window.CtaFooter = CtaFooter;
