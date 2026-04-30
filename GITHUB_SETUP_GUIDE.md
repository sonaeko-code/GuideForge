# GuideForge: GitHub Repository Setup Guide

## Project Overview

**Project Name:** GuideForge  
**Description:** AI-powered gaming guide builder with automatic template rendering and mock generation system  
**Framework:** Next.js 16 (App Router), React 19  
**Package Manager:** pnpm  
**Node Version:** 18+ recommended

### What is GuideForge?

GuideForge is a platform for building structured gaming guides, repair documentation, and procedural content. It features:
- Interactive guide builder with real-time editing
- AI-assisted generation (mock generation implemented, OpenAI ready)
- Automatic guide rendering from structured data
- Support for multiple network types (gaming, repair, SOP, creator, training, community)
- Forge Rules system for quality control and consistency

---

## Repository Structure

### Application Routes (`/app`)

**Public Pages (QuestLine):**
- `/n/questline/` — Main gaming guide hub
- `/n/[networkSlug]/` — Dynamic network pages
- `/n/[networkSlug]/[hubSlug]/[guideSlug]/` — Guide detail pages
- `/app/page.tsx` — Landing page

**Builder Routes (Admin):**
- `/builder/welcome` — Onboarding wizard
- `/builder/network/new` — Create new network
- `/builder/network/[networkId]/dashboard` — Network dashboard
- `/builder/network/[networkId]/hub/new` — Create hub
- `/builder/network/[networkId]/guide/new` — Create guide
- `/builder/network/[networkId]/guide/[guideId]/edit` — Edit guide
- `/builder/network/forge-rules` — Forge Rules configuration
- `/builder/network/[networkId]/generate` — Guide generation page

### Components (`/components`)

**GuideForge Builder Components:**
- `create-network-form.tsx` — Network creation with autofill
- `create-hub-form.tsx` — Hub creation with generation
- `create-guide-form.tsx` — Guide creation
- `guide-editor.tsx` — Full guide editor with section regeneration
- `starter-page-picker.tsx` — Page template selector

**GuideForge Shared:**
- `difficulty-badge.tsx`, `status-badge.tsx`, `empty-state.tsx`

**UI Library (shadcn/ui):**
- 50+ reusable components (button, card, dialog, form, input, select, etc.)

**QuestLine Components:**
- Gaming-specific headers, footers, media placeholders

### Utilities & Types (`/lib`)

**GuideForge Core:**
- `types.ts` — TypeScript interfaces for Network, Hub, Guide, ForgeRules
- `mock-data.ts` — Sample data for Emberfall, Starfall Outriders, etc.
- `mock-generator.ts` — Generation functions (Network, Hub, Guide, Rules, Section)
- `generation-schemas.ts` — TypeScript interfaces for generated data
- `template-registry.ts` — Template metadata and routing
- `forge-rules.ts` — Rule definitions and checkers
- `wizard.ts` — Builder wizard flow state

**QuestLine:**
- `mock-news.ts` — Sample news/patch data

---

## Key Features & Technologies

### Generation System (Mock + OpenAI Ready)

**Implemented Functions:**
```typescript
generateMockNetworkDraft(networkType) → GeneratedNetworkDraft
generateMockHubDraft(hubKind) → GeneratedHubDraft
generateMockGuide(request) → GeneratedGuide
generateAlternateSectionContent(kind) → string
suggestMockForgeRules(networkType) → ForgeRulesSuggestion
```

**Status:** Mock generation fully functional. OpenAI integration points documented in `AUTOMATION_DESIGN.md`.

### Styling

- **Framework:** Tailwind CSS v4 with Tailwind Typography
- **Component Library:** shadcn/ui v0.3.0+
- **Theme System:** CSS variables in `globals.css`
- **Design Tokens:** Color, radius, spacing via CSS custom properties

### Database Integration (Placeholder)

Currently using mock data. Ready for:
- **Supabase:** Full auth + database
- **PostgreSQL:** Via Neon or Aurora
- **Row-Level Security:** Documented in types

---

## Installation & Development

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm (or npm/yarn)

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/guideforge.git
cd guideforge

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev
```

### Environment Variables

Create `.env.local`:
```env
# Optional: Supabase (when integrating database)
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Optional: OpenAI (for real generation)
# OPENAI_API_KEY=your_key

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=your_ga_id
```

### Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run TypeScript check
pnpm type-check

# Format code
pnpm format

# Lint
pnpm lint
```

---

## Architecture & Design Patterns

### Data Flow

1. **Builder → Mock Generation:**
   - User clicks "Autofill Network" / "Generate Draft" / "Regenerate Section"
   - Mock generator produces draft data
   - Form fields populate (user can edit)
   - Mock shows "no credits used" banner

2. **Draft → Published:**
   - User edits guide, applies Forge Rules, clicks Publish
   - TODO: Save to Supabase with status="published"
   - Public route renders via template system

3. **Template Rendering:**
   - Structured guide data flows to `/app/n/[networkSlug]/[hubSlug]/[guideSlug]/page.tsx`
   - Template registry determines layout
   - Guide renders with theme + metadata

### Key Architectural Decisions

- **No ORM:** Direct Supabase queries (when integrated)
- **RSC-First:** Server Components by default, `"use client"` only where needed
- **Type Safety:** Full TypeScript coverage
- **Modular Forms:** Each form is standalone component with state management
- **Mock-First:** Generation system uses mocks, swappable for OpenAI

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel dashboard
3. Connect environment variables
4. Deploy on push to main

### Other Platforms

Supports any Node.js 18+ host (AWS, Azure, Railway, etc.)

**Build command:** `pnpm build`  
**Start command:** `pnpm start`

---

## Testing

### What's Tested (Manual)
- Create Network → Autofill → Form populates ✓
- Create Hub → Generate Draft → Form populates ✓
- Guide Editor → Regenerate Section → Content updates ✓
- Guide Editor → Apply Forge Rules → Results show ✓

### TODO: Add Tests
- Unit tests for mock generators
- Integration tests for form flows
- E2E tests for builder wizard

---

## Documentation Files

- **`AUTOMATION_DESIGN.md`** — Generation system architecture, OpenAI integration points, credit system design
- **`README.md`** — Getting started guide
- **`CONTRIBUTING.md`** — Code style, commit conventions

---

## Integration Checklist (Next Steps)

### Phase 1: Database (Week 1-2)
- [ ] Connect Supabase
- [ ] Create schema (networks, hubs, guides, forge_rules)
- [ ] Migrate mock data to database
- [ ] Add Row-Level Security policies

### Phase 2: Authentication (Week 2-3)
- [ ] Add Supabase Auth
- [ ] Protect /builder routes
- [ ] Add user dashboard
- [ ] Track user credits

### Phase 3: OpenAI Integration (Week 3-4)
- [ ] Replace mock generators with OpenAI API calls
- [ ] Add streaming UI for generation
- [ ] Implement error handling & retries
- [ ] Cost tracking & credit deduction

### Phase 4: Production Ready (Week 4-5)
- [ ] Add tests
- [ ] Set up monitoring (error tracking, analytics)
- [ ] Performance optimization
- [ ] Security audit

---

## File Size & Performance

**Key Metrics:**
- Production bundle size: ~250KB gzipped (initial load)
- Largest components: guide-editor (~400 lines), mock-generator (~350 lines)
- No external API calls in mock mode
- Full TypeScript compilation ~3-5s

---

## Troubleshooting

### Build Errors

**"Cannot find module 'generateMockNetworkDraft'"**
- Check `lib/guideforge/mock-generator.ts` is present
- Run `pnpm install` to ensure all dependencies

**"Property 'networkId' is missing"**
- Check route params are passed correctly via `useRouter()` hook
- Verify dynamic route filenames use `[paramName]` format

### Preview Issues

**Form doesn't autofill on button click**
- Ensure component is marked `"use client"`
- Check `onClick` handler is properly wired to mock function
- Look for TypeScript errors in console

---

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Run TypeScript check: `pnpm type-check`
4. Commit: `git commit -m "feat: add your feature"`
5. Push and create PR

---

## License

MIT

---

## Support

For questions or issues:
1. Check `AUTOMATION_DESIGN.md` for architecture questions
2. Review existing GitHub issues
3. Create new issue with detailed reproduction steps

---

## Project Status

**Current Phase:** Mock Generation Complete, Ready for Production Integration

**What Works:**
- ✓ Guide builder with live editing
- ✓ Mock generation for networks, hubs, guides, sections
- ✓ Forge Rules system
- ✓ Template rendering infrastructure
- ✓ Mock data viewer

**What's Coming:**
- Supabase database integration
- Real OpenAI generation
- User authentication
- Credit system + billing
- Advanced features (versioning, comments, collaborative editing)
