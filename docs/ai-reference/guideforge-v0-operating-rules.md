# GuideForge v0 Operating Rules

## Purpose

Document the workflow and constraints for v0 when working on GuideForge. These rules ensure predictable, auditable work and prevent accidental deployments or breaking changes.

## Core Rule: No Bash Commands Without Explicit Request

**CRITICAL:** Do not run these commands unless the user explicitly asks:

- `pnpm run build`
- `pnpm install` / `npm install`
- `yarn install` / `bun install`
- `npx` (any command)
- `git` commands (commit, push, merge, etc.)
- `find`, `grep`, `xargs`, or other file search commands
- Any terminal/Bash command not in this allowed list

### Allowed Commands (Read-Only)
- `ls` (listing directories)
- `cat` (viewing file content, though Read tool is preferred)
- `pwd` (checking current directory)

## Required Workflow

### For Code/Doc Changes

1. **Understand the codebase** using v0 tools:
   - Read: Read file contents
   - Glob: Find files by pattern
   - Grep: Search file contents

2. **Make changes** using v0 tools:
   - Edit: Modify existing files (preferred)
   - Write: Create new files (only if explicitly needed)
   - Move: Copy/relocate files
   - Delete: Remove files

3. **Report what was done:**
   - List files created/modified
   - Summarize changes in 1-4 sentence postamble
   - Do NOT include terminal output or build logs

4. **Stop and wait** for user to:
   - Run `pnpm run build` or `npm run build` locally
   - Run tests
   - Run `git commit` and `git push`
   - Deploy to Vercel or staging
   - Test in browser/preview

### For Reading Documentation

1. Use Read tool to view existing docs
2. Glob to find documentation files
3. Grep to search doc content

### For Understanding Integration Points

1. Read relevant configuration files (tsconfig.json, package.json, etc.)
2. Read type definitions and interfaces
3. Grep for usage patterns in codebase
4. Do NOT run TypeScript compiler or linter

## File Tools Reference

| Task | Tool | Command |
|------|------|---------|
| View file content | Read | `Read(file_path)` |
| Find files | Glob | `Glob(pattern)` |
| Search content | Grep | `Grep(pattern)` |
| Modify existing file | Edit | `Edit(file_path, old_string, new_string)` |
| Create new file | Write | `Write(file_path, content)` |
| Copy/move file | Move | `Move(source, destination, operation)` |
| Delete file | Delete | `Delete(file_path)` |

## Commit Guidelines

When user runs `git commit`, the commit message should follow this format:

```
<subject>: <description>

<body (optional)>

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>
```

Example:
```
docs: Add AI reference documentation

Created docs/ai-reference/ folder with 4 markdown files:
- techsperts-ai-pattern.md: Verified-first AI architecture pattern
- guideforge-ai-checklist-target.md: GuideForge target architecture
- guideforge-v0-operating-rules.md: v0 workflow constraints
- guideforge-cross-repo-context.md: Context for multi-repo work

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>
```

## Testing Workflow

**User Responsibility:**

1. After v0 completes code changes:
   ```bash
   pnpm run build        # Verify TypeScript compilation
   pnpm run dev          # Start dev server
   ```

2. In browser, test the feature:
   - Navigate to affected pages
   - Test normal flow
   - Test error cases
   - Check console for errors

3. If issues found:
   - Report to v0 with error details
   - v0 fixes code
   - User tests again

4. If tests pass:
   ```bash
   git add .
   git commit -m "..."
   git push origin <branch>
   ```

## Deployment Workflow

**User Responsibility:**

1. After pushing, Vercel deploys preview automatically
2. Visit Vercel preview URL to test
3. If preview looks good:
   - Create PR on GitHub
   - Request code review
   - Merge to main when approved
4. Monitor production deployment

## Documentation Standards

- Use Markdown format (.md)
- Include headers, code blocks, tables for clarity
- Provide examples where applicable
- Reference related docs with links
- Use clear, concise language (avoid jargon)

## Code Standards

- Follow existing project patterns
- Use TypeScript for type safety
- Add JSDoc comments for complex functions
- Keep functions focused and testable
- Use semantic HTML and ARIA attributes
- Prefer Edit tool over Write for existing files

## Change Log Template

When documenting changes, use this structure:

```markdown
## What Changed
- List of modifications
- Brief description of each change

## Why
- Context for the change
- Link to issue/requirement if applicable

## Testing
- Manual steps to verify
- Expected outcomes

## Files Modified
- Path: Brief description of changes
```

## When to Ask for Clarification

Ask the user before proceeding if:
- Requirements are ambiguous
- Multiple valid approaches exist
- Change might break existing functionality
- New dependencies need to be added
- Build/test commands are needed to validate

## When NOT to Ask

Proceed without asking if:
- Task is clearly scoped
- Change is localized and low-risk
- Documentation or simple file creation
- Existing patterns can be followed

## Red Flags (Stop and Report)

- Build or test failures
- Import errors or missing types
- Breaking changes to existing APIs
- Database schema changes needed
- Security concerns identified
- Merge conflicts

## Summary

**DO:**
- Use Read, Glob, Grep, Edit, Write tools
- Make code/doc changes only
- Report what was done clearly
- Follow existing patterns
- Ask for clarification when needed

**DON'T:**
- Run build/install/git commands
- Deploy or test manually
- Make breaking changes without discussion
- Add unnecessary complexity
- Ignore existing architectural patterns

**Let User Handle:**
- Building and testing
- Committing and pushing
- Deploying to production
- Terminal commands (unless v0 explicitly requested)
