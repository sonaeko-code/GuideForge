# GuideForge

AI-powered guide builder for gaming, repair documentation, and procedural content.

## Features

- 🎮 **Gaming Guide Builder** — Create character builds, boss guides, leveling guides
- 🔧 **Repair Guides** — Technical documentation with step-by-step instructions
- 📋 **SOP Networks** — Standard operating procedures and business processes
- ✨ **AI-Assisted Generation** — Auto-generate guide drafts and sections
- 🎨 **Beautiful Templates** — Professional rendering with multiple themes
- 📊 **Forge Rules** — Consistency and quality control system
- 🔐 **Multi-Network Support** — Manage multiple guide networks in one platform

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## For Developers

### Project Structure

```
guideforge/
├── app/                      # Next.js App Router
│   ├── builder/             # Admin builder routes
│   ├── n/                   # Public guide pages
│   └── page.tsx             # Landing page
├── components/
│   ├── guideforge/          # Builder components
│   ├── questline/           # Public page components
│   └── ui/                  # shadcn/ui components (50+)
├── lib/guideforge/
│   ├── types.ts             # TypeScript interfaces
│   ├── mock-generator.ts    # AI generation functions
│   ├── template-registry.ts # Route templates
│   └── forge-rules.ts       # Quality rules
└── public/                  # Static assets
```

### Key Files

| File | Purpose |
|------|---------|
| `AUTOMATION_DESIGN.md` | Generation system & OpenAI integration |
| `GITHUB_SETUP_GUIDE.md` | Repository setup & deployment |
| `lib/guideforge/types.ts` | Data models |
| `lib/guideforge/mock-generator.ts` | Mock generation functions |

### Running Tests

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format
```

### Building for Production

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Architecture

### Generation System

GuideForge includes a mock generation system with placeholder for OpenAI integration:

```typescript
// Generate network draft
const draft = generateMockNetworkDraft("gaming");
// → { name, description, theme, subdomain, ... }

// Generate guide draft
const guide = generateMockGuide(request);
// → { title, slug, summary, sections, requirements, ... }
```

See `AUTOMATION_DESIGN.md` for detailed architecture and integration points.

### Database Integration

Currently uses mock data. Ready for Supabase:

```typescript
// Placeholder for future integration
const networks = await supabase
  .from("networks")
  .select("*")
  .eq("user_id", userId);
```

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fguideforge)

Or deploy to any Node.js 18+ environment.

## Documentation

- **[GitHub Setup Guide](./GITHUB_SETUP_GUIDE.md)** — Repository setup, deployment, integration checklist
- **[Automation Design](./AUTOMATION_DESIGN.md)** — Generation architecture, OpenAI integration, credit system
- **[Types Reference](./lib/guideforge/types.ts)** — Data model documentation

## Development Status

### ✅ Complete

- Guide builder with live editing
- Mock generation (Network, Hub, Guide, Section, Rules)
- Forge Rules system
- Template rendering infrastructure
- UI component library (50+ shadcn/ui components)

### 🚀 Next Steps

1. **Database Integration** — Connect Supabase
2. **Authentication** — Add user auth
3. **OpenAI Integration** — Replace mocks with real generation
4. **Billing System** — Credit tracking & Stripe payments
5. **Advanced Features** — Versioning, comments, collaboration

## Contributing

See individual feature branches for open tasks. PRs welcome!

## License

MIT

---

**Questions?** Check [GitHub Issues](https://github.com/yourusername/guideforge/issues) or see `GITHUB_SETUP_GUIDE.md` for troubleshooting.
