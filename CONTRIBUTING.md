# Contributing to GuideForge

First off, thanks for contributing! Here's how to get started.

## Code of Conduct

Be respectful and inclusive. This project welcomes contributions from everyone.

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm (or npm/yarn)
- Git

### Setup for Contributors

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/guideforge.git
cd guideforge

# Add upstream remote
git remote add upstream https://github.com/original-owner/guideforge.git

# Install dependencies
pnpm install

# Create feature branch
git checkout -b feature/your-feature-name
```

## Development Workflow

### Making Changes

1. **Branch naming:** Use `feature/`, `fix/`, `docs/`, `chore/` prefixes
   - Good: `feature/add-guide-versioning`
   - Good: `fix/form-validation-error`
   - Avoid: `my-changes`, `update`

2. **Code style:**
   - Use TypeScript for all new code
   - Follow existing patterns (check similar files first)
   - Use shadcn/ui components for UI
   - Keep components small and focused

3. **Run checks before committing:**
   ```bash
   # Type check
   pnpm type-check

   # Lint
   pnpm lint

   # Format code
   pnpm format

   # Build
   pnpm build
   ```

### Commit Messages

Use conventional commits:

```
feat: add guide versioning system
fix: resolve form validation error on create-hub
docs: update AUTOMATION_DESIGN.md with examples
chore: upgrade shadcn/ui to v0.4.0
```

Format: `<type>(<scope>): <message>`

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `style` — Code style (no logic change)
- `refactor` — Code refactoring
- `perf` — Performance improvement
- `test` — Tests
- `chore` — Tooling, dependencies

### Creating a Pull Request

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub:**
   - Title: Use conventional commit format
   - Description: Explain what changed and why
   - Link related issues: "Fixes #123"

3. **PR Checklist:**
   - [ ] TypeScript checks pass (`pnpm type-check`)
   - [ ] Lint passes (`pnpm lint`)
   - [ ] Build succeeds (`pnpm build`)
   - [ ] Code is formatted (`pnpm format`)
   - [ ] Documentation updated if needed
   - [ ] Changes follow existing patterns

## Project Structure Guidelines

### Adding New Pages

**Public pages** go in `/app/n/` with automatic routing.  
**Builder pages** go in `/app/builder/` with authentication checks (TODO).

```typescript
// Good: route params properly typed
export default async function GuidePage({ 
  params 
}: { 
  params: { guideSlug: string; hubSlug: string }
}) {
  // ...
}
```

### Adding Components

- **Builder components:** `/components/guideforge/builder/`
- **Shared utilities:** `/components/guideforge/shared/`
- **UI primitives:** `/components/ui/` (from shadcn/ui)

```typescript
// Good: client component marked explicitly
"use client"

import { useState } from "react"

interface ComponentProps {
  title: string
  onSubmit: (data: string) => void
}

export function MyComponent({ title, onSubmit }: ComponentProps) {
  // ...
}
```

### Adding Utilities

Place in `/lib/guideforge/` with clear naming:

```typescript
// lib/guideforge/my-utility.ts
export function myUtility(input: string): string {
  return input.toUpperCase()
}

export interface MyInterface {
  id: string
  name: string
}
```

## Testing Guidelines

### What to Test (Manual)

- Form submission flows
- Mock generation functions
- Route navigation
- Data display accuracy

### What to Add

Once testing infrastructure is in place:

```typescript
// examples/mock-generator.test.ts
import { generateMockNetworkDraft } from "@/lib/guideforge/mock-generator"

describe("generateMockNetworkDraft", () => {
  it("generates network with required fields", () => {
    const draft = generateMockNetworkDraft("gaming")
    expect(draft.name).toBeDefined()
    expect(draft.description).toBeDefined()
  })
})
```

## Documentation

### Update These Files When:

**README.md:**
- Adding new public features
- Changing setup instructions
- Adding new sections

**GITHUB_SETUP_GUIDE.md:**
- Adding/removing routes
- Changing deployment process
- Adding integrations

**AUTOMATION_DESIGN.md:**
- Changing generation logic
- Adding OpenAI integration
- Updating credit system

### Comment Guidelines

```typescript
// Good: explain why, not what
// Mock generation produces realistic drafts but doesn't persist
export function generateMockGuide(request: GenerationRequest) {
  // ...
}

// Avoid: what is obvious from code
// This function generates a mock guide
export function generateMockGuide(request: GenerationRequest) {
  // ...
}
```

## Working on Features

### Feature: Adding AI-Powered Section Suggestions

**Related Files:**
- `lib/guideforge/mock-generator.ts` — Add new function
- `components/guideforge/builder/guide-editor.tsx` — Add UI button
- `AUTOMATION_DESIGN.md` — Document OpenAI integration point

**Steps:**
1. Create mock function in mock-generator.ts
2. Add UI in guide-editor.tsx
3. Wire button to function
4. Test manually
5. Document in AUTOMATION_DESIGN.md
6. Create PR with clear description

### Feature: Database Integration

**Related Files:**
- `lib/guideforge/types.ts` — Add database schemas as comments
- `app/builder/network/[networkId]/dashboard/page.tsx` — Replace mock data fetch
- `GITHUB_SETUP_GUIDE.md` — Add Supabase setup instructions

**Steps:**
1. Design schema (comment in types.ts first)
2. Create Supabase tables
3. Update queries in components
4. Replace mock data functions
5. Add .env variables to .env.example
6. Test all flows
7. Update documentation

## Reporting Issues

### Good Issue Report

```
Title: Form validation doesn't show error for empty hub name

Description:
When I submit the Create Hub form with an empty name field, 
no error message appears and the form accepts it.

Steps to reproduce:
1. Go to /builder/network/[id]/hub/new
2. Leave hub name field empty
3. Click "Save Hub"
4. Form submits without error

Expected:
Error message: "Hub name is required"

Actual:
Form silently accepts empty value

Browser: Chrome 120
OS: macOS 14.2
```

## Performance Tips

### What to Avoid

- Don't fetch inside `useEffect` — use SWR or pass from RSC
- Don't render large lists without pagination
- Don't import entire libraries when you need one function

### What to Do

- Use Server Components by default
- Mark interactive components `"use client"`
- Use dynamic imports for large components
- Memoize expensive computations

## Getting Help

- **Questions:** Create GitHub Discussion
- **Bugs:** Create GitHub Issue with reproduction steps
- **Architecture:** Check `AUTOMATION_DESIGN.md` first
- **Setup issues:** See `GITHUB_SETUP_GUIDE.md` troubleshooting

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Thanked in pull request

Thanks for making GuideForge better!
