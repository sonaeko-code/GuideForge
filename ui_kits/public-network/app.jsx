function App() {
  return (
    <main>
      <PubNetworkHeader />
      <Masthead />
      <FeaturedGuide />
      <GameHubs />
      <ForgedShelf />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
