# GuideForge AI Builder UX Contract

## Shared Prompt-First Pattern

All GuideForge builders (Checklist, Single Guide, Network Guide, etc.) follow one consistent UX pattern:

### The 8-Step Flow

1. **Prompt is Always Primary**
   - Large textarea at the top of the builder
   - Prompt remains visible throughout the entire flow
   - User can see their original intent at any time

2. **Quick Fill / Smart Fill Never Erases Prompt**
   - Reads the prompt and extracts intent
   - Fills form fields based on parsed content
   - Leaves prompt textarea intact and visible
   - Shows feedback: "Fields filled from your prompt"

3. **AI Infers Builder Structure**
   - AI can recommend builder type, difficulty, audience, guide type
   - AI can suggest hub/collection placement (if in network)
   - User sees recommendations but can override manually
   - No forced decisions before AI assists

4. **User Edits and Confirms**
   - User reviews filled fields
   - User can edit or adjust any field
   - User can clear fields and manual-enter different values
   - Form is never locked

5. **User Generates Draft**
   - Distinct "Mock Preview" and "AI Generate" buttons
   - Clear state about which mode is active
   - Generation status shown with spinner

6. **User Sees Full Draft Preview**
   - Actual generated content displayed
   - For Checklist: sections, items, criteria visible
   - For Guide: steps/content visible
   - Assumptions/missing info shown but NOT as the only preview
   - User can see exactly what they're about to save

7. **Refinement Box Appears After Preview**
   - "Improve this Draft" box only shown after full content preview
   - References the visible content user just reviewed
   - Not shown before preview or as a barrier to saving

8. **User Saves or Sends**
   - "Save to Workspace" for asset builders
   - "Send to Editor" for network guides
   - Consistent language across all builders

## Builders Following This Pattern

### Checklist Asset Builder
- Route: `/builder/generate-asset/checklist`
- Input: Title, audience, goal, purpose, tone, sections, items
- Output: GeneratedChecklist saved to My Assets
- Status: ✅ Implementing prompt preservation

### Single Guide Asset Builder
- Route: `/builder/generate-asset/single_guide`
- Input: Title, audience, purpose, difficulty, guide type, steps
- Output: GeneratedSingleGuide saved to My Assets
- Status: ✅ Implementing prompt preservation

### Network Guide Generator
- Route: `/builder/network/[networkId]/generate`
- Input: Prompt, guide type, difficulty, hub, collection
- Output: GeneratedGuide sent to Guide Editor
- Status: ✅ Making prompt-first, adding Smart Fill

### Future Builders
- Network Scaffold Smart Fill (auto-create networks)
- Recipe Asset generation
- SOP Asset generation
- Troubleshooting Asset generation
- All follow same prompt-first pattern

## Key Rules

**DO:**
- Always display the original prompt
- Use Quick Fill / Smart Fill to intelligently prefill
- Show feedback when fields are filled from prompt
- Let AI suggest structure (type, difficulty, placement, etc.)
- Show full generated preview before refinement
- Use consistent button language across all builders
- Preserve all existing workflows (mock mode, smart fill, save)

**DON'T:**
- Erase or hide the original prompt
- Force manual field entry before AI assistance
- Show refinement box before content preview
- Use ambiguous language ("AIStructured" instead of "AI Generate")
- Create page crashes after save (safe navigation)
- Break existing asset drafts or guide editor handoff

## Error Handling

All builders use consistent error messages:

- **Generation Failure**: "AI generation failed. Try Mock Preview or simplify the prompt."
- **Save Failure**: "Failed to save draft. Check your connection and try again."
- **Missing Auth**: Redirect to login, then restore pending proposal
- **Asset Not Found**: Show friendly error instead of page crash

## Language Standardization

### Prompt/Fill Stage
- "Quick Fill" — fast heuristic extraction
- "Smart Fill" — AI-assisted field extraction
- "Fields filled from your prompt"
- Prompt textarea label: "Describe your [asset type]"

### Generation Stage
- "Mock Preview" — deterministic local generation
- "AI Generate" — AI-powered generation
- "Generating..." — spinner status
- "Generate Mock Draft" — button for checklist
- "Generate AI Draft" — button for checklist

### Preview Stage
- "Generated Draft Preview" — main preview section
- "Review the draft before saving" — subheading
- "Assumptions" — what AI assumed
- "Could Be Better With" — missing information

### Refinement Stage
- "Improve this Draft" — refinement section header
- "Tell GuideForge what to adjust" — textarea label
- "Apply Refinement" — button to request changes

### Save/Handoff Stage
- "Save to Workspace" — for assets
- "Send to Editor" — for network guides
- "Saved Successfully" — confirmation message

## Architecture Notes

- All builders route through `lib/guideforge/ai-builder-core.ts`
- Shared `GuideForgeBuilderRequest` contract
- Shared `GuideForgeBuilderResult` contract
- Pages provide context (network, hub, collection)
- Output type determines schema (checklist vs guide vs single guide)
- Forge Rules modify AI behavior if present

## Testing Checklist

- [ ] Prompt visible and preserved through entire flow
- [ ] Quick Fill/Smart Fill don't erase prompt
- [ ] Title extracted as concise text, not full prompt
- [ ] Mock Preview completes in ~1 second
- [ ] AI Generate works (if API configured)
- [ ] Actual content visible before "Improve this Draft"
- [ ] Save to Workspace completes without errors
- [ ] Asset detail page loads successfully
- [ ] No console errors for typos ("AIStructured", etc.)
- [ ] Button language consistent across all builders
