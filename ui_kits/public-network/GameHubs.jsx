function GameHubs() {
  const hubs = [
    { name: "Emberfall",       collections: 6, tagline: "A high-fantasy MMO with a brutal vertical-slice endgame.",        tone: "copper" },
    { name: "Hollowspire",     collections: 4, tagline: "Gothic action-RPG with hand-built bosses and a punishing parry.", tone: "teal"   },
    { name: "Starfall Outriders", collections: 5, tagline: "Sci-fi battle royale with class-driven loadouts.",             tone: "steel"  },
    { name: "Mechbound Tactics",  collections: 3, tagline: "Turn-based mech tactics with squad-level builds.",             tone: "rust"   },
  ];

  return (
    <section className="sec alt" data-screen-label="03 Game Hubs">
      <div className="container">
        <div className="sec-head">
          <div>
            <span className="sec-eyebrow">Featured games</span>
            <h2>Hubs we are covering this month</h2>
          </div>
          <a className="btn btn-ghost btn-sm" style={{padding: 0}}>
            All games <IconArrowRight size={14} />
          </a>
        </div>
        <div className="hubs">
          {hubs.map((h, i) => (
            <article key={h.name} className="hub-card">
              <div className="art" style={{
                background:
                  h.tone === "copper" ? "radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gf-copper) 35%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.34 0.05 50), oklch(0.22 0.02 55))" :
                  h.tone === "teal"   ? "radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gf-teal) 35%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.32 0.045 200), oklch(0.21 0.02 210))" :
                  h.tone === "steel"  ? "radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gf-steel-blue) 35%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.32 0.035 230), oklch(0.2 0.02 235))" :
                                        "radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gf-rust) 30%, transparent), transparent 55%), linear-gradient(135deg, oklch(0.33 0.05 30), oklch(0.22 0.025 35))"
              }}>
                <ConstellationArt seed={i} />
                <h3>{h.name}</h3>
              </div>
              <div className="below">
                <div className="meta">
                  <span>{h.collections} collections</span>
                  <IconArrowRight size={14} />
                </div>
                <p>{h.tagline}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

window.GameHubs = GameHubs;
