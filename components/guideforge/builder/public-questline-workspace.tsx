import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Globe, Gamepad2 } from "lucide-react"

export function PublicQuestlineWorkspace() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Globe className="size-6" aria-hidden="true" />
          Public QuestLine Preview
        </h2>
        <p className="text-sm text-muted-foreground">
          View how published guides appear to users on the public QuestLine site.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline">
            <Gamepad2 className="size-5" aria-hidden="true" />
            <div className="text-base font-semibold">QuestLine Home</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline/games">
            <div className="text-base font-semibold">Games</div>
            <div className="text-xs text-muted-foreground">All hubs</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline/emberfall">
            <div className="text-base font-semibold">Emberfall</div>
            <div className="text-xs text-muted-foreground">Game hub</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline/starfall-outriders">
            <div className="text-base font-semibold">Starfall Outriders</div>
            <div className="text-xs text-muted-foreground">Game hub</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline/hollowspire">
            <div className="text-base font-semibold">Hollowspire</div>
            <div className="text-xs text-muted-foreground">Game hub</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href="/n/questline/mechbound-tactics">
            <div className="text-base font-semibold">Mechbound Tactics</div>
            <div className="text-xs text-muted-foreground">Game hub</div>
          </Link>
        </Button>
      </div>
    </section>
  )
}
