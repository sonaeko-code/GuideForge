# Generation Flow Testing Guide

## Quick Test: End-to-End Generation Flow

### Prerequisites
- App running locally on localhost:3000
- Browser DevTools open (for localStorage inspection)

### Test Scenario: Create and Edit a Beginner Guide

**Time: 2 minutes**

#### Step 1: Navigate to Generate Page
```
URL: http://localhost:3000/builder/network/network_questline/generate
Expected: 
  - Form with fields: guide type, difficulty, hub, collection, prompt
  - "Generate Mock Structured Guide" button
  - Right panel for JSON preview (empty initially)
```

#### Step 2: Fill Form
```
Form Fields:
  - Guide Type: "Beginner Guide"
  - Preferred Difficulty: "Beginner"
  - Target Hub: "Emberfall"
  - Target Collection: "Beginner Guides"
  - Prompt: "Write a guide about the basics"
```

#### Step 3: Generate
```
Click: "Generate Mock Structured Guide" button
Expected:
  - Right panel shows JSON preview
  - JSON includes title, sections, requirements
  - "Send to Editor" button appears
  - No errors in console
```

#### Step 4: Send to Editor
```
Click: "Send to Editor" button
Expected:
  - Redirects to /builder/network/network_questline/guide/draft_TIMESTAMP/edit
  - Guide loads with:
    - Title at top
    - Summary section
    - List of sections (Overview, Strengths, etc.)
  - All section content visible
  - No errors in console
```

#### Step 5: Test Section Regeneration
```
Action: Click refresh icon (Sparkles) on any section card
Expected:
  - Section text changes
  - Card highlights green
  - "Generated draft updated" message appears
  - Highlight fades after 2 seconds
  - Can regenerate same section multiple times
```

#### Step 6: Test Forge Rules
```
Click: "Apply Forge Rules" button (if visible in editor)
Expected:
  - Results panel appears
  - Shows "Rules passed — ready for review"
  - Lists 6-8 rule checks with checkmarks
  - Shows: "N/M requirements met"
```

#### Step 7: Verify localStorage
```
Open: DevTools → Application → Storage → Local Storage
Look for: guideforge:drafts:draft_XXXXX
Expected:
  - Key exists
  - Contains full guide JSON
  - Includes all sections, title, summary
```

#### Step 8: Test Persistence
```
Action: Refresh page (F5)
Expected:
  - Guide data persists
  - Same guide loads immediately
  - No "Loading..." state visible
```

---

## Advanced Tests

### Test: Fallback to Mock Data
**Objective**: Verify fallback works when draft not found

```
1. Open DevTools → Console
2. Run: localStorage.removeItem("guideforge:drafts:draft_XXXXX")
3. Refresh page
4. Expected: FIRE_WARDEN_GUIDE loads instead
5. You should see "Fire Warden" title
```

### Test: Multiple Drafts
**Objective**: Create multiple drafts, verify each has unique ID

```
1. Create draft 1 (beginner-guide)
2. Edit, then click "Create Another"
3. Generate and send to editor
4. Verify: Different draftId in URL
5. Verify: Different guide content
6. Both localStorage keys should exist
```

### Test: Manual Editing
**Objective**: Verify editor allows manual edits

```
1. In editor, click on Title field
2. Change title text
3. Expected: Title updates immediately
4. Regenerate a section
5. Expected: Manual edits preserved
```

---

## Checklist: All Components Working

- [ ] Generate page loads (no 404)
- [ ] Generate form accepts input
- [ ] "Generate Mock Structured Guide" button works
- [ ] JSON preview shows generated guide
- [ ] "Send to Editor" button works
- [ ] Editor page loads with generated guide
- [ ] Section refresh buttons work
- [ ] Section text changes on refresh
- [ ] Section highlight animation works (green, then fades)
- [ ] "Generated draft updated" message shows
- [ ] "Apply Forge Rules" button works (if present)
- [ ] Rules results panel displays
- [ ] localStorage key exists (check DevTools)
- [ ] Page refresh preserves guide data
- [ ] No TypeScript errors in console
- [ ] No JavaScript errors in console

---

## Expected Behavior: Generation Flow

### Generate Page
| Action | Expected Result |
|--------|-----------------|
| Fill form + Generate | JSON preview populates |
| Click Send to Editor | Navigate to editor with draftId |
| Navigate directly to /generate | Form shows empty state |

### Editor Page
| Action | Expected Result |
|--------|-----------------|
| Click section refresh | Section content changes, green highlight |
| Click Apply Forge Rules | Results panel with checklist appears |
| Refresh browser page | Same guide data persists |
| Manually edit title | Title updates in real-time |

### Storage
| Action | Expected Result |
|--------|-----------------|
| Generate and edit | localStorage key created |
| Refresh page | localStorage retrieved and displayed |
| Clear localStorage | Fallback to FIRE_WARDEN_GUIDE |
| Open DevTools | Key format: guideforge:drafts:draft_XXXXX |

---

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" error | Run `pnpm install` or `npm install` |
| Page shows FIRE_WARDEN_GUIDE instead of generated guide | Check localStorage key exists in DevTools |
| No JSON preview after generating | Check browser console for errors |
| Draft lost after page refresh | Verify localStorage is enabled |
| draftId doesn't match URL | Clear browser cache, restart dev server |

---

## Browser DevTools Checks

### Check 1: localStorage Inspection
```
1. Open DevTools (F12)
2. Go to Application tab
3. Expand Local Storage
4. Look for key: guideforge:drafts:draft_XXXXX
5. Click key to see full JSON value
Expected: Full guide object with all sections
```

### Check 2: Console Errors
```
1. Open Console tab
2. Generate guide
3. Send to editor
Expected: No red errors, all messages should be normal logs
```

### Check 3: Network Tab
```
1. Open Network tab
2. Generate guide
3. Send to editor
Expected: Navigation request only, no additional API calls
(OpenAI integration will add API calls later)
```

---

## Performance Baseline

| Metric | Target | Notes |
|--------|--------|-------|
| Generate button response | < 1s | Mock generator is instant |
| Editor page load | < 2s | localStorage retrieval is fast |
| Section regeneration | < 500ms | Instant with mock data |
| Page refresh persistence | < 500ms | JSON parse from localStorage |

---

## Success Criteria

✓ User generates guide from form  
✓ Generated data appears in editor  
✓ All sections are editable  
✓ Section regeneration works with visual feedback  
✓ Guide persists across page refreshes  
✓ Forge Rules checklist displays  
✓ No errors in console  
✓ TypeScript compilation clean  

All criteria met = Generation flow fully functional.
