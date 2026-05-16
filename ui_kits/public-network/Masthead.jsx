function Masthead() {
  return (
    <section className="mast" data-screen-label="01 Masthead">
      <div className="container">
        <div className="meta">
          <span className="star">✦</span>
          <span>Issue No. 04</span>
          <span className="dot" />
          <time>May 15, 2026</time>
          <span className="dot" />
          <span>An editorial guide network</span>
        </div>
        <h1>Quest<em>Line</em></h1>
        <p className="lede">
          Editorial guides, patch coverage, and build theory for the games you
          actually play. Forged by writers, reviewed by veterans, structured for
          the moment you need them.
        </p>
        <dl className="stats">
          <div className="stat"><dt>Games covered</dt><dd>4</dd></div>
          <div className="stat"><dt>Forged guides</dt><dd>92</dd></div>
          <div className="stat"><dt>In review</dt><dd>24</dd></div>
          <div className="stat"><dt>Last patch</dt><dd className="num">4.2</dd></div>
        </dl>
      </div>
    </section>
  );
}

window.Masthead = Masthead;
