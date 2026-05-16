function SiteHeader({ active }) {
  const links = [
    { id: "what", label: "What it builds" },
    { id: "how",  label: "How it works" },
    { id: "examples", label: "Networks" },
    { id: "trust",label: "Trust" },
  ];

  return (
    <header className="gf-header" data-screen-label="00 Header">
      <div className="container gf-header-inner">
        <a className="gf-brand" href="#">
          <span className="gf-seal"><GuideMark /></span>
          <span className="gf-wordmark">Guide<em>Forge</em></span>
        </a>
        <nav className="gf-nav" aria-label="Primary">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} className={active === l.id ? "active" : ""}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="gf-cta">
          <button className="btn btn-ghost btn-sm">Sign in</button>
          <button className="btn btn-primary btn-sm">
            Start building
          </button>
        </div>
      </div>
    </header>
  );
}

window.SiteHeader = SiteHeader;
