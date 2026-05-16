function ConstellationArt({ seed = 0 }) {
  // Deterministic constellation node positions
  const sets = [
    [[40,30],[110,55],[160,40],[200,85],[265,60]],
    [[60,55],[120,30],[180,70],[245,40]],
    [[50,40],[100,80],[170,55],[220,30],[270,75]],
  ];
  const nodes = sets[seed % sets.length];
  const w = 320, h = 120;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      {nodes.map((n, i) => (
        i < nodes.length - 1
          ? <line key={`l${i}`} x1={n[0]} y1={n[1]} x2={nodes[i+1][0]} y2={nodes[i+1][1]} stroke="#C7A15A" strokeWidth="1"/>
          : null
      ))}
      {nodes.map((n, i) => (
        <circle key={`c${i}`} cx={n[0]} cy={n[1]} r={3} fill="#E8C781"/>
      ))}
      <circle cx={nodes[1][0] + 18} cy={nodes[1][1] - 12} r={1.2} fill="#E8C781"/>
      <circle cx={nodes[2][0] - 14} cy={nodes[2][1] + 14} r={1.2} fill="#C7A15A"/>
    </svg>
  );
}

function FeaturedGuide() {
  return (
    <section className="sec" data-screen-label="02 Featured">
      <div className="container">
        <div className="sec-head">
          <div>
            <span className="sec-eyebrow">✦ Featured</span>
            <h2>The build everyone is reading right now</h2>
          </div>
        </div>

        <div className="feat-grid">
          <article>
            <div className="media">
              <ConstellationArt seed={0} />
              <div className="label-overlay">
                Featured Build
                <strong>Best Fire Warden Beginner Build</strong>
              </div>
            </div>
            <div className="feat-meta">
              <span className="badge b-pub"><span className="d" />Published</span>
              <span className="badge b-forged">✦ Forged</span>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)"}}>Patch 4.2 · 12 min read</span>
            </div>
            <h3 className="feat-h">An opinionated path through Emberfall — gear, talents, and rotation.</h3>
            <p className="feat-l">
              Twelve minutes from level one to your first viable raid run. The
              Fire Warden's strengths, where it falls off, and the only three
              decisions that matter before the patch shifts.
            </p>
            <div className="byline">
              <strong>@elara.f</strong>
              <span style={{margin: "0 6px", opacity: .5}}>·</span>
              Reviewed by <strong>@thatch</strong>
            </div>
          </article>

          <aside className="dispatch">
            <div className="head">
              <h4>Latest dispatch</h4>
              <a className="all">All →</a>
            </div>
            {[
              { cat: "Patch", hub: "Emberfall",   t: "Patch 4.2 lands: Fire Warden buffs, Frost Sage rework", time: "5 min · May 14" },
              { cat: "Season",hub: "Hollowspire", t: "Season of the Hollow Choir — three new collections", time: "8 min · May 13" },
              { cat: "Build", hub: "Mechbound",   t: "The skirmisher loadout actually meta-prepping right now", time: "6 min · May 12" },
              { cat: "Notes", hub: "Starfall",    t: "Outrider PvP queue health, four weeks in", time: "4 min · May 10" },
            ].map((d, i) => (
              <div key={i} className="item">
                <div className="cat">
                  <span className="a">{d.cat}</span>
                  <span className="b">·</span>
                  <span className="b">{d.hub}</span>
                </div>
                <h5>{d.t}</h5>
                <div className="time">{d.time}</div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

window.FeaturedGuide = FeaturedGuide;
window.ConstellationArt = ConstellationArt;
