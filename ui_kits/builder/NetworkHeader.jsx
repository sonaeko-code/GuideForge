function NetworkHeader() {
  return (
    <section className="net-h" data-screen-label="02 Network Header">
      <div className="net-h-row">
        <div className="ident">
          <span className="seal">Q</span>
          <div>
            <h1>QuestLine</h1>
            <div className="sub">
              <span style={{fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--gf-copper)"}}>Gaming Guide Network</span>
              <span className="dot" />
              <span>questline.guideforge.dev</span>
              <span className="dot" />
              <span>Patch 4.2</span>
            </div>
          </div>
        </div>
        <div style={{display: "flex", gap: 10}}>
          <button className="btn btn-outline btn-sm"><IconBoxes size={14} /> Forge Rules</button>
          <button className="btn btn-primary btn-sm"><IconArrowRight size={14} /> Generate</button>
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat with-icon">
          <div>
            <span className="lbl">Total Guides</span>
            <span className="v">128 <span className="delta up">↑ 12%</span></span>
          </div>
          <span className="icon"><IconFile size={22} /></span>
        </div>
        <div className="stat with-icon">
          <div>
            <span className="lbl">Forged</span>
            <span className="v">92 <span className="delta up">↑ 18%</span></span>
          </div>
          <span className="icon"><IconStamp size={22} /></span>
        </div>
        <div className="stat with-icon">
          <div>
            <span className="lbl">In Review</span>
            <span className="v">24 <span className="delta dn">↓ 5%</span></span>
          </div>
          <span className="icon" style={{color: "var(--gf-steel-blue)"}}><IconLayers size={22} /></span>
        </div>
        <div className="stat with-icon">
          <div>
            <span className="lbl">Hubs</span>
            <span className="v">16 <span className="delta up">↑ 22%</span></span>
          </div>
          <span className="icon"><IconNetwork size={22} /></span>
        </div>
      </div>
    </section>
  );
}

window.NetworkHeader = NetworkHeader;
