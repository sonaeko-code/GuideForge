function App() {
  return (
    <main>
      <SiteHeader active="what" />
      <LandingHero />
      <WhatItBuilds />
      <HowItWorks />
      <ExampleNetworks />
      <TrustSection />
      <CtaFooter />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
