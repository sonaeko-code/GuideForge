import Link from "next/link"
import { Gamepad2, GraduationCap, LifeBuoy, Users, Wrench, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const EXAMPLES = [
  {
    icon: Gamepad2,
    name: "QuestLine",
    type: "Gaming Guide Network",
    blurb:
      "Builds, beginner paths, raid mechanics, and patch coverage across multiple games.",
    featured: true,
    link: "/n/questline",
  },
  {
    icon: Wrench,
    name: "FieldFix",
    type: "Repair / Support Platform",
    blurb:
      "Procedural repair guides with safety callouts, model targeting, and revision history.",
  },
  {
    icon: LifeBuoy,
    name: "Runbook",
    type: "Business SOP Portal",
    blurb:
      "Process owners, revision numbers, and structured SOPs your team will actually follow.",
  },
  {
    icon: GraduationCap,
    name: "Atlas",
    type: "Training Library",
    blurb: "Curriculum-shaped collections, module guides, and audience targeting.",
  },
  {
    icon: Users,
    name: "Commons",
    type: "Community Knowledge Base",
    blurb: "Structured community guides with trust tiers and contributor credit.",
  },
]

export function ExampleNetworks() {
  return (
    <section
      id="examples"
      className="border-b border-border bg-secondary/40"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col gap-3 md:max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Example Networks
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            One engine. Many network types.
          </h2>
          <p className="text-pretty text-muted-foreground">
            The first live demo is a gaming network. The same engine powers repair,
            SOP, training, creator, and community networks—coming next.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map(({ icon: Icon, name, type, blurb, featured, link }) => (
            <article
              key={name}
              className={`flex flex-col gap-3 rounded-xl border bg-card p-5 ${
                featured
                  ? "border-primary/40 ring-1 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
                {featured ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Live demo
                  </span>
                ) : (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming next
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {name}
                </h3>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {type}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground flex-1">
                {blurb}
              </p>
              {link && (
                <Button asChild size="sm" variant="ghost" className="gap-2 w-full justify-start">
                  <Link href={link}>
                    Explore
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
