const STEPS = [
  {
    n: "01",
    title: "Pick a direction",
    body: "Gaming, repair, SOP, creator, training, or community. Each direction comes with its own opinionated Forge Rules.",
  },
  {
    n: "02",
    title: "Generate a structured site",
    body: "Name your network, theme it, and pick a domain. GuideForge scaffolds your hubs, collections, and starter pages.",
  },
  {
    n: "03",
    title: "Forge guides, not pages",
    body: "Use the structured editor with required sections, status, and Forge Rules baked in. No blank canvas.",
  },
  {
    n: "04",
    title: "Publish, export, or embed",
    body: "Ship to a hosted, branded guide page — or export and embed your guides anywhere your readers are.",
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col gap-3 md:max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            How it works
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            From idea to a hosted, exportable guide network.
          </h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="font-mono text-xs font-semibold tracking-widest text-primary">
                {step.n}
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
