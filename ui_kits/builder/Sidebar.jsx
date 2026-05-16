function Sidebar({ active, onNavigate }) {
  const groups = [
    {
      label: "Workspace",
      items: [
        { id: "overview",  label: "Overview",  icon: <IconCompass size={16} /> },
        { id: "guides",    label: "Guides",    icon: <IconFile size={16} />,  count: 128 },
        { id: "networks",  label: "Networks",  icon: <IconNetwork size={16}/>, count: 16 },
        { id: "checklists",label: "Checklists",icon: <IconBoxes size={16} />, count: 42 },
      ],
    },
    {
      label: "Quality",
      items: [
        { id: "reviews",   label: "Reviews",   icon: <IconStamp size={16} />,  count: 7 },
        { id: "insights",  label: "Insights",  icon: <IconStar size={16} /> },
        { id: "governance",label: "Governance",icon: <IconLifeBuoy size={16}/> },
      ],
    },
    {
      label: "System",
      items: [
        { id: "settings",  label: "Settings",  icon: <IconBoxes size={16} /> },
      ],
    },
  ];

  return (
    <aside className="ws-side" data-screen-label="00 Sidebar">
      <div className="brand">
        <span className="seal"><GuideMark /></span>
        <span className="word">Guide<em>Forge</em></span>
      </div>

      {groups.map(g => (
        <React.Fragment key={g.label}>
          <div className="group-label">{g.label}</div>
          <nav>
            {g.items.map(it => (
              <a
                key={it.id}
                className={active === it.id ? "active" : ""}
                onClick={() => onNavigate && onNavigate(it.id)}
              >
                {it.icon}
                <span>{it.label}</span>
                {it.count != null && <span className="count">{it.count}</span>}
              </a>
            ))}
          </nav>
        </React.Fragment>
      ))}

      <div className="spacer" />
      <div className="userpane">
        <div className="userrow">
          <div className="avatar">A</div>
          <div>
            <div className="uname">Alex Forrester</div>
            <div className="urole">Editor · QuestLine</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
