"use client"

import { ArrowRight, Plus, Sparkles, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NetworkWorkspace } from "./network-workspace"
import { DraftWorkspace } from "./draft-workspace"
import { PublicQuestlineWorkspace } from "./public-questline-workspace"

export function BuilderWorkspace() {
  const networkId = "network_questline"

  return (
    <div className="space-y-12">
      {/* Network Workspace Section */}
      <NetworkWorkspace networkId={networkId} />

      {/* Draft Workflow Section */}
      <DraftWorkspace networkId={networkId} />

      {/* Public QuestLine Section */}
      <PublicQuestlineWorkspace />
    </div>
  )
}
