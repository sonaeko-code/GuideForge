function App() {
  const [active, setActive] = React.useState("guides");

  return (
    <div className="ws" data-screen-label="Builder Workspace">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="ws-pane">
        <WorkspaceTopbar crumbs={["GuideForge", "QuestLine", "Guides"]} />
        <div className="ws-content">
          <NetworkHeader />
          <GuidesTable />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
