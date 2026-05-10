# GuideForge Guided Intake / Diagnostic Onboarding Flow — Backlog

**Status:** Future feature / Not currently implemented.

## Core Idea

The first prompt should open the door.
The follow-up questions should build the map.
The final output should feel like the system understood the user, not like the user had to engineer the perfect prompt.

Instead of expecting users to write perfect, detailed prompts upfront, GuideForge can:
1. Accept a simple starting description
2. Ask targeted clarifying questions
3. Refine the request based on answers
4. Generate better-structured drafts that reflect the user's actual intent

## Two Use Cases

### 1. Techsperts Diagnostic Use Case

```
User describes issue/problem
  ↓
System asks diagnostic questions to narrow the problem space
  ↓
System matches verified solutions to the diagnosis
  ↓
Guided Fix starts if confidence is high
  ↓
Escalates to human expert if confidence is low
```

**Example:**
- User: "My Git merge is failing"
- System asks: "Is it a conflict? Network? Permission?"
- User answers clarification questions
- System says: "This is a merge conflict. Here's the guided fix..."

### 2. GuideForge Asset Creation Use Case

```
User describes what they want to build (simple, broad description)
  ↓
GuideForge asks clarifying creation questions
  ↓
System recommends asset type(s) and network structure
  ↓
AI generates better structured drafts based on answers
  ↓
User saves/refines/attaches/publishes later
```

**Example:**
- User: "I need a launch checklist for my game"
- System asks: "What platform? Early access or full launch? What genre?"
- User answers
- System says: "You need 4-5 sections. Here's a proposal..." → AI generates it
- User refines and saves

## Technical Approach

### Phase 1: Intake Questions (Server-side)

Define intake question templates per asset type. Example for checklists:

```typescript
{
  assetType: "checklist",
  intakeQuestions: [
    {
      id: "audience",
      question: "Who will use this checklist?",
      hint: "e.g., Game developers, DevOps engineers, Quality assurance",
      type: "text"
    },
    {
      id: "context",
      question: "What's the main goal or outcome?",
      hint: "e.g., Launch a game update, Deploy a service, QA a release",
      type: "text"
    },
    {
      id: "constraints",
      question: "Any specific constraints or risks to prepare for?",
      hint: "e.g., rollback planning, downtime windows, dependencies",
      type: "text",
      optional: true
    }
  ]
}
```

### Phase 2: Augmented Prompt

Enhance the AI prompt with intake answers:

```typescript
buildAugmentedChecklistPrompt(userInput: string, intakeAnswers: Record<string, string>): string {
  return `
Original request: ${userInput}
Additional context from user:
- Audience: ${intakeAnswers.audience}
- Goal: ${intakeAnswers.context}
- Constraints: ${intakeAnswers.constraints || 'None specified'}

Generate a checklist that directly addresses these specifics...
  `
}
```

### Phase 3: UI Components

- Modal/dialog for intake questions (before AI generation)
- Show questions one at a time or batched
- Allow skipping optional questions
- Display "customizing your generation..." message during augmented prompt

## Monetization Hooks

**Not being built yet**, but future monetization could involve:

1. **First generation free** — First guided intake runthrough might be free tier
2. **Subsequent generations require credits/plan** — Saving, refining, exporting, embedding, or deeper generation uses plan credits
3. **Batch intake/multi-asset generation** — Guided workflows that create 3+ assets at once
4. **Network attachment** — Attaching generated assets to networks might require credits

## Relationship to Existing Systems

- **Does NOT change schema** — asset_drafts, networks, user roles all stay the same
- **Enhances generation prompt** — Intake answers feed into existing buildChecklistPrompt()
- **Complements existing Mock/AI flows** — Runs before generation, not after
- **Does NOT replace edit/delete** — User can still manually edit titles, sections, items after generation

## Next Steps (When Ready)

1. Define intake questions per asset type (JSON schema)
2. Build intake UI component (modal/dialog)
3. Integrate intake answers into prompt builders
4. Test quality of AI output with augmented prompts vs. baseline
5. Measure: do users rate intake-guided generations as better?

## Backlog Position

- ✓ Phase 1: Asset generation working (Mock + AI)
- ✓ Phase 2: Quality validation working
- ✓ Phase 3: Proposal UX and asset detail UX polished
- **Future:** Guided Intake onboarding flow

**Priority:** Nice-to-have. Current focus is on quality + UX of core generation flow.
