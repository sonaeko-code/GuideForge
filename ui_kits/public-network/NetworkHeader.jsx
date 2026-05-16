function NetworkHeader({ name = "QuestLine", type = "Gaming Guide Network" }) {
  return (
    <header className="pub-h" data-screen-label="00 Network Header">
      <div className="pub-h-inner">
        <div className="ident">
          <span className="seal">Q</span>
          <div>
            <div className="name">{name}</div>
            <div className="type">{type}</div>
          </div>
        </div>
        <nav>
          <a className="active">Home</a>
          <a>Hubs</a>
          <a>Guides</a>
          <a>News</a>
          <a>About</a>
        </nav>
        <span className="pill">Public Network</span>
      </div>
    </header>
  );
}

window.PubNetworkHeader = NetworkHeader;
