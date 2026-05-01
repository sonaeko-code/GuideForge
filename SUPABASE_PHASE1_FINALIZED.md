## GuideForge Supabase Phase 1 - SQL Finalization Complete

### Files Created

1. **`supabase/guideforge_phase1_schema.sql`** (344 lines)
   - Complete schema with proper foreign key ordering
   - 11 tables: profiles, networks, hubs, collections, guides, guide_steps, forge_rules, network_forge_rules, forge_rule_check_runs, forge_rule_check_results, generation_events
   - Deferred FK constraint for guides.latest_check_run_id (added after forge_rule_check_runs table)
   - Comprehensive indexes for performance
   - Auto-updating timestamp triggers on all mutable tables
   - Row Level Security (RLS) policies for data isolation

2. **`supabase/guideforge_phase1_seed.sql`** (186 lines)
   - One dev profile (UUID: 550e8400-e29b-41d4-a716-446655440000)
   - QuestLine network owned by dev profile
   - Emberfall and StarFall Outriders hubs
   - Character Builds and Boss Strategies collections
   - 9 Forge Rules (game_name_present, descriptive_title, has_summary, patch_version, has_sections, spoiler_tagging, difficulty_rating, requirements_listed, guide_status_clear)
   - Network-Forge Rules junction records connecting all rules to QuestLine with enabled/required flags
   - Commented-out example guides for optional testing

### Schema Summary

**Core Hierarchy** (5 levels):
- Networks → Hubs → Collections → Guides → Guide Steps

**Forge Rules System** (Deterministic validation):
- Global forge_rules (9 standard quality checks)
- Per-network configuration via network_forge_rules (enabled, required, display_order)
- Check tracking: forge_rule_check_runs (with content_hash for staleness detection)
- Individual results: forge_rule_check_results

**MVP Scope**:
- Profiles: Minimal user data (display_name, handle, avatar, bio, role)
- Guides: 4 statuses (draft, ready, published, archived) + 5 verification states
- No denormalized arrays—pure foreign key relationships
- Auth-light: One seeded dev profile sufficient for MVP (Phase 2 adds Supabase Auth UI)

### Seed Data Summary

- **1 Dev Profile**: Display name "Dev Guide Author", handle "dev_author"
- **1 Network**: QuestLine (public, gaming type)
- **2 Hubs**: Emberfall (🔥), StarFall Outriders (⭐)
- **2 Collections**: Character Builds, Boss Strategies
- **9 Forge Rules**: All configured for QuestLine with required flags set for core 5 (game name, title, summary, sections, status)
- **Starter Guides**: Commented out but provided as template for manual testing

### SQL Assumptions & Design Decisions

1. **Foreign Key Ordering**: guides.latest_check_run_id added as deferred constraint after forge_rule_check_runs table to avoid circular dependency
2. **Trigger Function**: Single update_updated_at_column() function reused for all tables with updated_at
3. **RLS Strategy**: Public networks/guides visible to all; drafts only to author; network management by owner only
4. **Auth-Light MVP**: Uses fixed dev UUID instead of requiring Supabase Auth sign-up (Phase 2 integration point)
5. **Content Hash**: forge_rule_check_runs.content_hash enables staleness detection via MD5/SHA256 of guide title+summary+version+steps
6. **Generation Events**: Optional table for AI event tracking, included but not critical for Phase 1

### SQL Execution Checklist (Manual Steps)

**When ready to implement** (NOT YET):

1. Provision Supabase project and get Database URL
2. Copy connection string to `.env.local` as SUPABASE_DB_URL (keep private)
3. Run in Supabase SQL Editor or via psql:
   ```bash
   psql postgresql://[user]:[password]@[host]/[database] < supabase/guideforge_phase1_schema.sql
   psql postgresql://[user]:[password]@[host]/[database] < supabase/guideforge_phase1_seed.sql
   ```
4. Verify data with query verification comments at end of seed file
5. Create Supabase client in app code (Phase 2)
6. Replace localStorage with Supabase queries (Phase 2)
7. Add real Supabase Auth integration (Phase 3)

### What's NOT Included Yet

- No Supabase client code
- No environment variables added
- No localStorage replacement
- No Supabase Auth UI
- No public QuestLine guide migration
- No real secrets/credentials

### Risk Mitigations in Schema

1. **Content Safety**: RLS ensures users only see own drafts or published content
2. **Data Integrity**: Cascading deletes prevent orphaned records; foreign keys guarantee consistency
3. **Performance**: Strategic indexes on frequent queries (author_id, status, collection_id)
4. **Staleness Detection**: content_hash in check_runs enables validator to detect when content changed post-validation
5. **Extensibility**: type enums (gaming, repair, sop, training, community) support future network types without schema changes

### Next Manual Steps

1. **Review** this schema with team for any adjustments
2. **Discuss** content_hash implementation (MD5 vs SHA256) and staleness detection window
3. **Plan** Phase 2: Supabase client integration and localStorage replacement
4. **Prepare** Supabase Auth UI for Phase 3 (currently MVP uses seeded dev profile)
5. **Schedule** manual SQL execution when project is ready

---

**Status**: Schema finalized, SQL ready for review. NO SQL EXECUTED. NO SUPABASE PROVISIONED. NO ENV VARS ADDED.
