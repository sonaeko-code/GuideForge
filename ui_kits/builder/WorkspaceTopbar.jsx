function WorkspaceTopbar({ crumbs }) {
  return (
    <div className="ws-top" data-screen-label="01 Topbar">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "here" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="actions">
        <button className="btn btn-outline btn-sm">
          <IconCompass size={14} /> Visit public site
        </button>
        <button className="btn btn-primary btn-sm">
          <IconStar size={14} /> New guide
        </button>
      </div>
    </div>
  );
}

window.WorkspaceTopbar = WorkspaceTopbar;
