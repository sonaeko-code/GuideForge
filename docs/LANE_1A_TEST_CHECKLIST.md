## Lane 1A - Quick Test Checklist

Use this checklist to validate the implementation manually.

---

## PRE-TEST VERIFICATION

- [ ] No TypeScript errors in project
- [ ] Project builds successfully
- [ ] Dev server runs without crashes
- [ ] Welcome page loads at `/builder/welcome`

---

## TEST 1: Broad Household System Routes to Network

**Steps**:
1. Navigate to `/builder/welcome`
2. Paste into the idea field:
   ```
   I need a system to track my kids' routines, medications, allergies, and emergency contacts. Include seasonal maintenance tasks and a baby supply checklist.
   ```
3. Observe the recommendation

**Expected**:
- [ ] Recommendation says "Network" (not Checklist)
- [ ] Confidence is "high" or "medium-high"
- [ ] Reasoning mentions "multi-domain household/family system"
- [ ] Network type shows as "home_systems" or similar household-oriented type
- [ ] Theme shows as "parchment"

**Next**:
4. Click the recommended path button (should go to `/builder/network/new`)
5. Wait for page to load

**Expected**:
- [ ] Network setup page loads
- [ ] Form shows "roughIdea" field pre-filled with your text
- [ ] "name" field is filled with something home/family-oriented (e.g., "Home & Family Management")
- [ ] "type" dropdown shows "home_systems" or similar
- [ ] "theme" dropdown shows "parchment" selected
- [ ] Hubs include family/home-relevant categories (routines, health, maintenance, supplies—NOT "Boss Guides" or "Builds & Loadouts")
- [ ] Message shows "Imported from your welcome prompt" (if applicable)

---

## TEST 2: Bounded Medication Checklist Routes to Checklist

**Steps**:
1. Navigate to `/builder/welcome` (fresh session or open in new tab)
2. Paste:
   ```
   I need a daily medication checklist with reminders and a completion streak.
   ```
3. Observe recommendation

**Expected**:
- [ ] Recommendation says "Checklist"
- [ ] Confidence is "high" or "medium-high"
- [ ] Reasoning focuses on "bounded task" or "repeatable task list"

**Next**:
4. Click recommended path (should go to `/builder/generate-asset/checklist`)

**Expected**:
- [ ] Checklist form loads
- [ ] "title" field shows "Daily Medication Checklist" or similar (title-cased)
- [ ] "useCase" field shows your original idea
- [ ] "purpose" field has something like "Track daily medication" or similar
- [ ] "tone" field shows "practical" or similar reasonable default
- [ ] "numberOfSections" and "itemsPerSection" have reasonable defaults (3-5)
- [ ] Message shows "Imported from your welcome prompt"
- [ ] Form is editable (user can change any field)

---

## TEST 3: Tutorial Routes to Single Guide

**Steps**:
1. Navigate to `/builder/welcome` (fresh session)
2. Paste:
   ```
   Create a tutorial for publishing a YouTube gameplay video.
   ```
3. Observe recommendation

**Expected**:
- [ ] Recommendation says "Single Guide"
- [ ] Confidence is "medium"
- [ ] Reasoning mentions "instructional intent" or "tutorial"

**Next**:
4. Click recommended path (should go to `/builder/generate-asset/single_guide`)

**Expected**:
- [ ] Single guide form loads
- [ ] "title" field shows "Publishing a YouTube Gameplay Video" or similar (title-cased, preserving YouTube casing)
- [ ] "useCase" field shows your original idea
- [ ] "purpose" field has something relevant
- [ ] "guideType" field shows "tutorial" or similar
- [ ] "difficulty" shows reasonable default (intermediate)
- [ ] "numberOfSteps" shows 5 or similar reasonable default
- [ ] Message shows "Imported from your welcome prompt"

---

## TEST 4: Direct Access Still Works (No Session Contamination)

**Steps**:
1. Directly navigate to `/builder/network/new` (without going through welcome)
2. Observe form state

**Expected**:
- [ ] Page loads without errors
- [ ] Form shows default values (no random data)
- [ ] No "Imported from welcome prompt" message
- [ ] User can use the form normally

**Next**:
3. Directly navigate to `/builder/generate-asset/checklist` (without welcome)

**Expected**:
- [ ] Page loads without errors
- [ ] Form shows default empty/default values
- [ ] No import message

**Next**:
4. Directly navigate to `/builder/generate-asset/single_guide` (without welcome)

**Expected**:
- [ ] Page loads without errors
- [ ] Form shows defaults
- [ ] No import message

---

## TEST 5: Existing Wizard Draft Wins Over Intake Session

**Steps**:
1. Navigate to `/builder/network/new` (no session)
2. Fill in network details manually:
   - Name: "My Test Network"
   - Type: "gaming"
   - Description: "A gaming guide network"
3. Click "Continue to Preview" (moves to preview step)
4. Observe form preserves data

**Expected**:
- [ ] Preview shows your entered data
- [ ] Data persists (existing draft saved to wizard-state)

**Next**:
5. Go back (browser back button or use "← Back" link)
6. Observe network setup page

**Expected**:
- [ ] Your previous edits are restored (name, type, description still show your values)
- [ ] No unexpected data overwrites

---

## TEST 6: Network Auto-Smart-Fill on Welcome Hydration

**Steps**:
1. Navigate to `/builder/welcome` (fresh session)
2. Paste a moderately detailed idea:
   ```
   I want to create a personal knowledge base for organizing all my projects, learning notes, daily routines, and long-term goals. It should have separate sections for each area and help me track progress.
   ```
3. Observe recommendation

**Expected**:
- [ ] Recommends Network
- [ ] Suggests appropriate type (personal_knowledge or similar)
- [ ] Suggests theme (parchment or soft)

**Next**:
4. Click recommended path (goes to `/builder/network/new`)

**Expected**:
- [ ] Auto-Smart-Fill ran and pre-filled fields:
  - [ ] "name" field shows something like "Personal Knowledge Base" or "My Knowledge Network"
  - [ ] "description" describes the multi-domain system
  - [ ] "type" is set to detected type
  - [ ] "theme" is set to suggested theme
  - [ ] "slug" looks reasonable (no weird characters)
  - [ ] Hubs in scaffold are domain-relevant (Projects, Learning, Daily, Goals—NOT gaming hubs)
  - [ ] Message or console log indicates auto-Smart-Fill ran
- [ ] Form is fully editable (user can override everything)

---

## TEST 7: AIIntakeLadder Quick Fill Still Works

**Steps**:
1. Navigate to `/builder/generate-asset/checklist`
2. Scroll to "Start with a rough idea" section
3. Fill in a rough idea and click "Quick Fill" button
4. Observe results

**Expected**:
- [ ] Quick Fill processes without error
- [ ] Fields populate with parsed values
- [ ] Parser is using shared logic (same results as welcome hydration)

---

## TEST 8: No Regressions - Existing Flows Unaffected

**Steps**:
1. Test existing single guide creation (manual fill, no welcome):
   - [ ] Form works normally
   - [ ] Generate button works
   - [ ] Proposal preview works
   - [ ] Save/edit flows work

2. Test existing checklist creation:
   - [ ] Form works normally
   - [ ] Generate button works
   - [ ] Proposal preview works
   - [ ] Save/edit flows work

3. Test existing network creation:
   - [ ] Form works normally
   - [ ] Smart Fill button works (manual)
   - [ ] Type selection works
   - [ ] Theme selection works
   - [ ] Scaffold editor works

---

## TEST 9: Session Cleanup

**Steps**:
1. Complete Test 1 (household system → network)
2. Go back to welcome via browser back button
3. Fill in a completely different idea (e.g., checklist about grocery shopping)
4. Observe recommendation

**Expected**:
- [ ] Recommendation is for the NEW idea (grocery checklist), not the old one
- [ ] Old session was properly cleaned up (not bleeding through)

---

## TEST 10: Error Handling

**Steps**:
1. Navigate to `/builder/welcome`
2. Submit an extremely vague idea:
   ```
   stuff
   ```
3. Observe recommendation

**Expected**:
- [ ] Recommendation still works (defaults to something reasonable)
- [ ] No console errors
- [ ] Confidence is "low" (appropriate)

**Next**:
4. Navigate to `/builder/network/new` with no welcome session
5. Leave "roughIdea" empty and click "Smart Fill"

**Expected**:
- [ ] Error message shows: "Please describe your network idea"
- [ ] No crash
- [ ] Form still usable

---

## CONSOLE / DEBUG CHECKS

While testing, open browser DevTools console and check:

- [ ] No TypeScript errors
- [ ] No JavaScript runtime errors
- [ ] For Test 6, should see: `[v0] CreateNetworkForm: Auto-running Smart Fill on welcome intake hydration`
- [ ] Intake session is cleared after hydration (sessionStorage keys should be gone)
- [ ] No "Infinity" or "NaN" in numeric fields
- [ ] No warnings about missing props

---

## FINAL SIGN-OFF

Once all tests pass:

- [ ] All routing rules working correctly
- [ ] All destination hydration working
- [ ] Auto-Smart-Fill working for network
- [ ] No regressions in existing flows
- [ ] Session management safe and clean
- [ ] No console errors

**Status**: ✅ **READY FOR PRODUCTION**
