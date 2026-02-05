# Credential UX Enhancement Work Plan

## TL;DR

> **Quick Summary**: Enhance credential management for CDC app with 3-tier scope hierarchy, auto-linking during import, ad-hoc credential creation, reference-based shared credentials (no duplication), and real-time SSE sync for all credential operations.
>
> **Deliverables**:
>
> - 3-tier credential scope model (global | team-wide | vm-specific)
> - Auto-link known accounts during import
> - Inline ad-hoc credential creation with minimal required fields
> - Reference-based display for shared credentials (single source of truth)
> - SSE events for all credential CRUD operations
>
> **Estimated Effort**: Medium (3 phases, ~12 tasks)
> **Parallel Execution**: YES - 3 waves with independent tasks
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 7 -> Task 10

---

## Context

### Original Request

Enhance the user experience when handling saved passwords for teams/VMs in a cyber defense competition app with hierarchical credential management, import enhancements, ad-hoc creation, auto-sync, and hash cracking integration.

### Interview Summary

**Key Decisions**:

- **Scope Model**: 3-tier (global | team-wide | vm-specific) - cleanly separates how broadly credentials apply from which VMs they've been tested on
- **Auto-Linking**: Automatically associate imported hash with existing credential when username matches
- **Ad-hoc Creation**: All scenarios equally important (username-only, hash-only, password-only)
- **Duplication Strategy**: Reference-based display - shared credentials stored ONLY in shared.json, merged at display time
- **Previous Work**: CDC transformation fully implemented - this is NEW enhancement work

### Research Findings (from Metis Review)

**Current State**:

- TeamCredential has `credentialType: 'shared' | 'tsi'` but NO `scope` field
- VM has `scope: 'global' | 'team-specific'` (different model)
- `mergeSharedCredentials()` uses reference pattern (good)
- `propagateSharedCredentialsToTeams()` COPIES to teams (contradicts goal)
- SSE has 9 event types but NO credential CRUD events

**Guardrails Applied** (from Metis review):

- Remove `propagateSharedCredentialsToTeams()` entirely (causes duplication)
- Add `scope` field to TeamCredential, deprecate `credentialType` over time
- Auto-linking: case-insensitive username + hashType matching
- Shared credentials are READ-ONLY from team view
- Single ad-hoc creation is scope 1 - no bulk operations

---

## Work Objectives

### Core Objective

Transform credential management from 2-tier (shared/tsi) to 3-tier scope model with intelligent import linking, inline ad-hoc creation, and real-time sync across all devices.

### Concrete Deliverables

1. **Type Updates**: Add `scope` field to TeamCredential type
2. **Storage Updates**: Reference-based shared credential display (remove copying)
3. **Import Enhancement**: Auto-link known accounts by username
4. **Ad-hoc Creation**: Inline credential editor with minimal required fields
5. **SSE Events**: Credential CRUD events with real-time broadcast
6. **UI Updates**: Scope badges, inline editing, shared credential indicators

### Definition of Done

- [ ] Credential scope displays correctly (global/team-wide/vm-specific badges)
- [ ] Importing username that exists auto-links instead of duplicating
- [ ] Can create credential with just username OR just hash OR just password
- [ ] Shared credentials appear in team view without copying to team vault
- [ ] All credential changes sync to other devices within 1 second
- [ ] All acceptance criteria verified with Playwright browser automation

### Must Have

- 3-tier scope model with clear UI indicators
- Auto-linking during import (case-insensitive username match)
- Inline ad-hoc credential creation with any single field
- Reference-based shared credential display
- SSE events for credential create/update/delete

### Must NOT Have (Guardrails)

- NO bulk ad-hoc creation (single credential only for scope 1)
- NO credential versioning or history tracking
- NO approval workflow for shared credentials
- NO changes to NTLM parsing logic (already works well)
- NO breaking changes to existing import API contract
- NO copying of shared credentials to team vaults (remove propagation)
- NO edits to shared credentials from team view (read-only)

---

## Verification Strategy

### Test Infrastructure

- **Infrastructure exists**: YES - Playwright E2E tests in `./tests/e2e/`
- **Framework**: Playwright (`@playwright/test` v1.57.0)
- **Approach**: E2E tests for UI verification + API curl tests for backend

### Verification by Task Type

**Type/Storage Tasks (Phase 1)**:

- TypeScript compilation: `bun tsc --noEmit`
- Unit tests for scope logic

**API Tasks (Phase 2)**:

- curl/httpie tests for endpoints
- Response validation

**UI Tasks (Phase 3)**:

- Playwright browser automation
- Screenshot evidence in `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Foundation):
├── Task 1: Update TeamCredential type with scope field
├── Task 2: Update storage utilities for reference-based display
└── Task 3: Add SSE event infrastructure for credentials

Wave 2 (After Wave 1 - Core Features):
├── Task 4: Implement auto-link logic in import endpoint
├── Task 5: Add credential CRUD API endpoints
├── Task 6: Create inline credential editor component
└── Task 7: Update EnhancedImportModal with auto-link preview

Wave 3 (After Wave 2 - Integration):
├── Task 8: Add SSE listeners in useConnection.ts
├── Task 9: Update TeamVaultPanel with scope badges and inline editing
├── Task 10: Update credential table to show shared credential indicators
├── Task 11: Add credential CRUD event broadcasting
└── Task 12: E2E testing and verification

Critical Path: Task 1 → Task 2 → Task 4 → Task 7 → Task 10
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks     | Can Parallelize With |
| ---- | ---------- | ---------- | -------------------- |
| 1    | None       | 2, 4, 5, 6 | 3                    |
| 2    | 1          | 4, 10      | 3                    |
| 3    | None       | 8, 11      | 1, 2                 |
| 4    | 1, 2       | 7          | 5, 6                 |
| 5    | 1          | 6, 11      | 4                    |
| 6    | 1, 5       | 9          | 7                    |
| 7    | 4          | 9          | 6                    |
| 8    | 3          | 9          | 10, 11               |
| 9    | 6, 7, 8    | 12         | 10, 11               |
| 10   | 2, 8       | 12         | 9, 11                |
| 11   | 3, 5       | 12         | 9, 10                |
| 12   | 9, 10, 11  | None       | None (final)         |

---

## TODOs

### Phase 1: Foundation (Wave 1)

- [ ] 1. Update TeamCredential Type with Scope Field

  **What to do**:

  - Add `scope: 'global' | 'team-wide' | 'vm-specific'` field to TeamCredential interface
  - Add type guard `isValidScope()` for validation
  - Create migration helper to derive scope from existing credentialType + vmIds:
    - `credentialType: 'shared'` → `scope: 'global'`
    - `credentialType: 'tsi'` with `vmIds.length === 0` → `scope: 'team-wide'`
    - `credentialType: 'tsi'` with `vmIds.length > 0` → `scope: 'vm-specific'`
  - Keep `credentialType` for backward compatibility (deprecated)
  - Add `CredentialScope` type alias for reuse

  **Must NOT do**:

  - Don't remove `credentialType` field yet (backward compatibility)
  - Don't modify VM types (already have scope)
  - Don't change existing API contracts

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: TypeScript type definitions are straightforward refactoring
  - **Skills**: [`git-master`]
    - `git-master`: For clean atomic commits of type changes

  **Parallelization**:

  - **Can Run In Parallel**: YES with Task 3
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 4, 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:

  - `src/types/teamVault.ts:26-39` - Current TeamCredential interface to extend
  - `src/types/teamVault.ts:8-21` - VM type with existing scope pattern to follow
  - Pattern: `scope: 'global' | 'team-specific'` already exists on VM - mirror this

  **Acceptance Criteria**:

  ```bash
  # TypeScript compiles without errors
  bun tsc --noEmit
  # Expected: Exit code 0, no type errors

  # Verify type exists
  bun -e "import { TeamCredential } from './src/types/teamVault'; const c: TeamCredential = { id: '1', hash: 'x', hashTypeId: 1000, hashTypeName: 'NTLM', username: null, password: null, credentialType: 'tsi', scope: 'team-wide', vmIds: [], source: null, crackedAt: null, createdAt: '', updatedAt: '' }; console.log('scope:', c.scope);"
  # Expected: "scope: team-wide"
  ```

  **Commit**: YES

  - Message: `feat(types): add 3-tier scope field to TeamCredential`
  - Files: `src/types/teamVault.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 2. Update Storage for Reference-Based Shared Display

  **What to do**:

  - Remove `propagateSharedCredentialsToTeams()` function from sharedStorage.ts (causes duplication)
  - Update `mergeSharedCredentials()` to properly handle scope field
  - Update `getTeamVaultWithShared()` to mark shared credentials as read-only in response
  - Add `isSharedCredential(credential)` helper function
  - Update deduplication logic to handle scope precedence:
    - Team credentials (team-wide, vm-specific) take precedence over global
    - When displaying, mark shared credentials distinctly

  **Must NOT do**:

  - Don't change how team-specific credentials are stored
  - Don't modify shared.json file format (just add scope field)
  - Don't remove any API endpoints

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Storage utility modifications following existing patterns
  - **Skills**: [`git-master`]
    - `git-master`: For clean storage refactoring commits

  **Parallelization**:

  - **Can Run In Parallel**: YES with Task 3
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 10
  - **Blocked By**: Task 1 (needs scope type)

  **References**:

  - `src/utils/sharedStorage.ts:278-305` - propagateSharedCredentialsToTeams() TO REMOVE
  - `src/utils/teamStorage.ts:501-537` - mergeSharedCredentials() to enhance
  - `src/utils/teamStorage.ts:540-560` - getTeamVaultWithShared() to update

  **Acceptance Criteria**:

  ```bash
  # Verify propagation function removed
  bun -e "import * as shared from './src/utils/sharedStorage'; console.log('has propagate:', 'propagateSharedCredentialsToTeams' in shared);"
  # Expected: "has propagate: false"

  # Verify merge still works
  bun -e "import { mergeSharedCredentials } from './src/utils/teamStorage'; const result = mergeSharedCredentials('test-team'); console.log('merge returned array:', Array.isArray(result));"
  # Expected: "merge returned array: true"
  ```

  **Commit**: YES

  - Message: `refactor(storage): remove shared credential copying, use reference-based display`
  - Files: `src/utils/sharedStorage.ts`, `src/utils/teamStorage.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 3. Add SSE Event Infrastructure for Credentials

  **What to do**:

  - Define new event types in a types file or comments:
    - `credentialCreated`: `{ teamId: string, credential: TeamCredential }`
    - `credentialUpdated`: `{ teamId: string, credential: TeamCredential, changedFields: string[] }`
    - `credentialDeleted`: `{ teamId: string, credentialId: string, hash: string }`
    - `sharedCredentialUpdated`: `{ credential: TeamCredential }` (global scope)
  - Create `src/utils/credentialEvents.ts` with broadcast functions:
    - `broadcastCredentialCreated(teamId, credential)`
    - `broadcastCredentialUpdated(teamId, credential, changedFields)`
    - `broadcastCredentialDeleted(teamId, credentialId, hash)`
    - `broadcastSharedCredentialUpdated(credential)`
  - Follow pattern from `src/utils/teamEvents.ts`

  **Must NOT do**:

  - Don't modify existing event types
  - Don't change SSE connection handling
  - Don't add event batching (keep simple for scope 1)

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Following existing teamEvents.ts pattern exactly
  - **Skills**: [`git-master`]
    - `git-master`: For clean utility file commits

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 1, 2
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8, 11
  - **Blocked By**: None

  **References**:

  - `src/utils/teamEvents.ts:1-67` - Pattern to follow for credential events
  - `src/utils/miscUtils.ts:sendEventToAll` - Core broadcast function to use
  - `src/app/api/events/route.ts:47-88` - Understanding of event flow

  **Acceptance Criteria**:

  ```bash
  # Verify event functions exist
  bun -e "import { broadcastCredentialCreated, broadcastCredentialUpdated, broadcastCredentialDeleted } from './src/utils/credentialEvents'; console.log('functions exist:', typeof broadcastCredentialCreated === 'function');"
  # Expected: "functions exist: true"
  ```

  **Commit**: YES

  - Message: `feat(events): add SSE event infrastructure for credential CRUD`
  - Files: `src/utils/credentialEvents.ts`
  - Pre-commit: `bun tsc --noEmit`

---

### Phase 2: Core Features (Wave 2)

- [ ] 4. Implement Auto-Link Logic in Import Endpoint

  **What to do**:

  - Modify `src/app/api/teams/[teamId]/import/route.ts` to:
    1. Before creating credentials, fetch existing credentials (team + shared)
    2. Build lookup map: `Map<lowercaseUsername, existingCredential>`
    3. For each imported credential with username:
       - Check if `username.toLowerCase()` exists in map
       - If match found AND hashType matches:
         - UPDATE existing credential (merge vmIds, update hash if different)
         - Mark as "linked" in response
       - If no match: CREATE new credential as before
    4. Return enhanced response: `{ created: number, linked: number, duplicates: number }`
  - Add `autoLink: boolean` option to import request (default: true)
  - Handle edge case: username match but different hashType = create new (not a match)

  **Must NOT do**:

  - Don't break existing import without username (hash-only imports)
  - Don't link across different hashTypes
  - Don't modify NTLM parsing logic
  - Don't auto-link if `autoLink: false` passed

  **Recommended Agent Profile**:

  - **Category**: `ultrabrain`
    - Reason: Complex matching logic with multiple edge cases
  - **Skills**: [`git-master`]
    - `git-master`: For careful API endpoint changes

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 5, 6
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2

  **References**:

  - `src/app/api/teams/[teamId]/import/route.ts:45-140` - Current import logic to enhance
  - `src/utils/teamStorage.ts:191-246` - addHashesToTeam() deduplication pattern
  - `src/utils/sharedStorage.ts:72-112` - addSharedCredential() lookup pattern

  **Acceptance Criteria**:

  ```bash
  # Test auto-link behavior (assuming test data exists)
  # 1. First, add a credential with username "TestAdmin"
  # 2. Then import a hash with username "testadmin" (case-insensitive)
  # 3. Should link instead of create duplicate

  curl -s -X POST http://localhost:3000/api/teams/test-team/import \
    -H "Content-Type: application/json" \
    -d '{"credentials": [{"username": "testadmin", "hash": "newhash123", "hashTypeId": 1000}]}' \
    | jq '{linked: .linked, created: .created}'
  # Expected (if TestAdmin exists): {"linked": 1, "created": 0}
  # Expected (if TestAdmin not exists): {"linked": 0, "created": 1}
  ```

  **Commit**: YES

  - Message: `feat(import): add auto-link for known account usernames`
  - Files: `src/app/api/teams/[teamId]/import/route.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 5. Add Credential CRUD API Endpoints

  **What to do**:

  - Create `src/app/api/teams/[teamId]/credentials/route.ts`:
    - `POST /api/teams/{teamId}/credentials` - Create single credential
      - Body: `{ username?: string, hash?: string, password?: string, hashTypeId?: number, scope?: string, vmIds?: string[] }`
      - Validation: At least ONE of username/hash/password required
      - Default scope: 'team-wide' if not specified
      - Default source: 'manual'
  - Create `src/app/api/teams/[teamId]/credentials/[credentialId]/route.ts`:
    - `GET` - Get single credential
    - `PUT` - Update credential fields
    - `DELETE` - Delete credential
  - Call `broadcastCredentialCreated/Updated/Deleted` after each operation
  - Return proper HTTP status codes (201 created, 200 updated, 204 deleted)

  **Must NOT do**:

  - Don't allow creating credentials with NO fields
  - Don't allow editing shared credentials from team endpoint
  - Don't allow duplicate hashes (check before create)

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: CRUD endpoints following existing API patterns
  - **Skills**: [`git-master`]
    - `git-master`: For clean API endpoint commits

  **Parallelization**:

  - **Can Run In Parallel**: YES with Task 4
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 6, 11
  - **Blocked By**: Task 1

  **References**:

  - `src/app/api/vms/route.ts` - Pattern for CRUD endpoints
  - `src/app/api/vms/[vmId]/route.ts` - Pattern for single-resource endpoints
  - `src/utils/teamStorage.ts` - Storage functions to call

  **Acceptance Criteria**:

  ```bash
  # Test create credential with just username
  curl -s -X POST http://localhost:3000/api/teams/test-team/credentials \
    -H "Content-Type: application/json" \
    -d '{"username": "discovered-account"}' \
    | jq '.credential.username'
  # Expected: "discovered-account"

  # Test create credential with just hash
  curl -s -X POST http://localhost:3000/api/teams/test-team/credentials \
    -H "Content-Type: application/json" \
    -d '{"hash": "abc123def456", "hashTypeId": 1000}' \
    | jq '.credential.hash'
  # Expected: "abc123def456"

  # Test validation - no fields should fail
  curl -s -X POST http://localhost:3000/api/teams/test-team/credentials \
    -H "Content-Type: application/json" \
    -d '{}' \
    | jq '.error'
  # Expected: error message about required fields
  ```

  **Commit**: YES

  - Message: `feat(api): add credential CRUD endpoints with SSE broadcast`
  - Files: `src/app/api/teams/[teamId]/credentials/route.ts`, `src/app/api/teams/[teamId]/credentials/[credentialId]/route.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 6. Create Inline Credential Editor Component

  **What to do**:

  - Create `src/app/components/InlineCredentialEditor.tsx`:
    - Modal form following VmManager pattern
    - Fields: username (optional), hash (optional), password (optional), hashType dropdown, scope selector, VM multi-select
    - Validation: At least one of username/hash/password required
    - Submit calls POST/PUT credential API
    - Support both create and edit modes
  - Props:
    - `isOpen: boolean`
    - `onClose: () => void`
    - `teamId: string`
    - `credential?: TeamCredential` (if editing)
    - `onSave: (credential: TeamCredential) => void`
  - Follow dark theme styling from existing modals

  **Must NOT do**:

  - Don't allow bulk creation
  - Don't add complex validation beyond "at least one field"
  - Don't allow editing shared credentials

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
    - Reason: UI component with form handling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: For consistent modal design

  **Parallelization**:

  - **Can Run In Parallel**: YES with Task 7
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 5

  **References**:

  - `src/app/components/VmManager.tsx:350-484` - Modal form pattern to follow
  - `src/app/components/EnhancedImportModal.tsx:1-100` - Modal structure pattern
  - `src/app/components/SearchableDropdown.tsx` - Dropdown component to reuse

  **Acceptance Criteria**:

  ```
  # Playwright browser verification:
  1. Navigate to: http://localhost:3000
  2. Select a team
  3. Click "Add Credential" button (to be added)
  4. Assert: Modal opens with form fields
  5. Enter only: username = "test-account"
  6. Click Save
  7. Assert: Modal closes, credential appears in table
  8. Screenshot: .sisyphus/evidence/inline-credential-editor.png
  ```

  **Commit**: YES

  - Message: `feat(ui): add inline credential editor with minimal required fields`
  - Files: `src/app/components/InlineCredentialEditor.tsx`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 7. Update EnhancedImportModal with Auto-Link Preview

  **What to do**:

  - Modify `src/app/components/EnhancedImportModal.tsx`:
    - After parsing, check each credential's username against existing credentials
    - In preview, show indicator for credentials that will be linked vs created:
      - Green badge: "New" for new credentials
      - Blue badge: "Links to existing" for auto-link matches
    - Add toggle: "Auto-link matching usernames" (default: on)
    - Update statistics to show: "X new, Y linked, Z duplicates"
  - Fetch existing credentials on modal open for comparison
  - Pass `autoLink` flag to import API

  **Must NOT do**:

  - Don't change parsing logic
  - Don't change VM assignment behavior
  - Don't change credential type selection

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
    - Reason: UI enhancement with preview logic
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: For intuitive preview design

  **Parallelization**:

  - **Can Run In Parallel**: YES with Task 6
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 4

  **References**:

  - `src/app/components/EnhancedImportModal.tsx:115-200` - Preview section to enhance
  - `src/app/components/EnhancedImportModal.tsx:250-300` - Statistics display to update

  **Acceptance Criteria**:

  ```
  # Playwright browser verification:
  1. Create a credential with username "ExistingAdmin"
  2. Open EnhancedImportModal
  3. Paste: "ExistingAdmin:500:hash:newhash:::"
  4. Assert: Preview shows "Links to existing" badge on ExistingAdmin
  5. Assert: Statistics show "0 new, 1 linked"
  6. Screenshot: .sisyphus/evidence/import-autolink-preview.png
  ```

  **Commit**: YES

  - Message: `feat(ui): add auto-link preview to import modal`
  - Files: `src/app/components/EnhancedImportModal.tsx`
  - Pre-commit: `bun tsc --noEmit`

---

### Phase 3: Integration (Wave 3)

- [ ] 8. Add SSE Listeners in useConnection.ts

  **What to do**:

  - Add event listeners for new credential events in `src/hooks/useConnection.ts`:
    - `credentialCreated` - Dispatch custom event for components
    - `credentialUpdated` - Dispatch custom event for components
    - `credentialDeleted` - Dispatch custom event for components
    - `sharedCredentialUpdated` - Dispatch custom event for components
  - Follow existing pattern for teamVaultUpdate listener
  - Add TypeScript types for event payloads

  **Must NOT do**:

  - Don't remove existing event listeners
  - Don't change connection management logic
  - Don't add complex event merging

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Following existing listener pattern exactly
  - **Skills**: [`git-master`]
    - `git-master`: For clean hook modifications

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 10, 11
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 3

  **References**:

  - `src/hooks/useConnection.ts:188-210` - teamVaultUpdate listener pattern
  - `src/utils/credentialEvents.ts` - Event types (from Task 3)

  **Acceptance Criteria**:

  ```bash
  # Verify event listeners exist (code inspection)
  grep -c "credentialCreated\|credentialUpdated\|credentialDeleted" src/hooks/useConnection.ts
  # Expected: 3 or more occurrences
  ```

  **Commit**: YES

  - Message: `feat(hooks): add SSE listeners for credential CRUD events`
  - Files: `src/hooks/useConnection.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 9. Update TeamVaultPanel with Scope Badges and Inline Editing

  **What to do**:

  - Modify `src/app/components/TeamVaultPanel.tsx`:
    - Add "Add Credential" button in header that opens InlineCredentialEditor
    - Add scope badge column to credential table (global=purple, team-wide=blue, vm-specific=green)
    - Add edit button to each credential row (pencil icon)
    - Wire edit button to InlineCredentialEditor in edit mode
    - Add scope filter dropdown (All | Global | Team-wide | VM-specific)
  - Listen to credential SSE events and update table in real-time
  - Disable edit button for shared credentials (scope: global)

  **Must NOT do**:

  - Don't remove existing type filter
  - Don't change credential delete behavior
  - Don't modify sync button functionality

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
    - Reason: UI enhancement with multiple new elements
  - **Skills**: [`frontend-ui-ux`, `dev-browser`]
    - `frontend-ui-ux`: For cohesive UI design
    - `dev-browser`: For testing interactions

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 10, 11
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  - `src/app/components/TeamVaultPanel.tsx:323-400` - Current table to enhance
  - `src/app/components/VmBadge.tsx` - Badge pattern for scope badges
  - `src/app/components/InlineCredentialEditor.tsx` - Editor component (from Task 6)

  **Acceptance Criteria**:

  ```
  # Playwright browser verification:
  1. Navigate to: http://localhost:3000
  2. Select a team with credentials
  3. Assert: "Add Credential" button visible
  4. Assert: Scope badges visible on credentials
  5. Assert: Edit button visible on team-specific credentials
  6. Assert: Edit button disabled/hidden on shared credentials
  7. Click edit on a credential
  8. Assert: InlineCredentialEditor opens with credential data
  9. Screenshot: .sisyphus/evidence/teamvault-enhanced.png
  ```

  **Commit**: YES

  - Message: `feat(ui): add scope badges and inline editing to TeamVaultPanel`
  - Files: `src/app/components/TeamVaultPanel.tsx`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 10. Update Credential Table to Show Shared Credential Indicators

  **What to do**:

  - Modify credential table in TeamVaultPanel:
    - Add visual indicator for shared credentials (e.g., lock icon, "Shared" badge)
    - Show tooltip: "This credential is shared across all teams. View-only."
    - Gray out or disable action buttons for shared credentials
    - Add "(Shared)" suffix or badge next to credential type
  - Ensure shared credentials are clearly distinguishable from team credentials
  - Style shared credential rows slightly differently (subtle background tint)

  **Must NOT do**:

  - Don't allow editing shared credentials
  - Don't allow deleting shared credentials from team view
  - Don't hide shared credentials (they should be visible)

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
    - Reason: Visual styling for shared credential distinction
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: For clear visual hierarchy

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 9, 11
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 2, 8

  **References**:

  - `src/app/components/TeamVaultPanel.tsx:350-400` - Credential row rendering
  - `src/utils/teamStorage.ts:mergeSharedCredentials` - How shared credentials are merged

  **Acceptance Criteria**:

  ```
  # Playwright browser verification:
  1. Add a shared credential via shared.json or API
  2. Navigate to team vault
  3. Assert: Shared credential visible with distinct styling
  4. Assert: Shared credential has lock icon or "Shared" badge
  5. Hover on shared credential
  6. Assert: Tooltip shows "shared across all teams"
  7. Assert: Edit/delete buttons disabled for shared credential
  8. Screenshot: .sisyphus/evidence/shared-credential-indicator.png
  ```

  **Commit**: YES

  - Message: `feat(ui): add visual indicators for shared credentials in team view`
  - Files: `src/app/components/TeamVaultPanel.tsx`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 11. Add Credential CRUD Event Broadcasting

  **What to do**:

  - Update all credential modification points to broadcast SSE events:
    - `src/app/api/teams/[teamId]/credentials/route.ts` POST → broadcastCredentialCreated
    - `src/app/api/teams/[teamId]/credentials/[credentialId]/route.ts` PUT → broadcastCredentialUpdated
    - `src/app/api/teams/[teamId]/credentials/[credentialId]/route.ts` DELETE → broadcastCredentialDeleted
    - `src/app/api/teams/[teamId]/import/route.ts` → broadcastCredentialCreated for each new credential
  - Ensure shared credential updates broadcast to all teams
  - Add event for cracked password sync (enhance existing)

  **Must NOT do**:

  - Don't send events for read operations
  - Don't batch events (keep 1 event per credential)
  - Don't change existing team-level events

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: Adding broadcast calls to existing endpoints
  - **Skills**: [`git-master`]
    - `git-master`: For clean API modifications

  **Parallelization**:

  - **Can Run In Parallel**: YES with Tasks 9, 10
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 3, 5

  **References**:

  - `src/utils/credentialEvents.ts` - Broadcast functions (from Task 3)
  - `src/app/api/teams/[teamId]/credentials/*.ts` - Endpoints (from Task 5)
  - `src/utils/teamEvents.ts:broadcastTeamVaultUpdate` - Pattern to follow

  **Acceptance Criteria**:

  ```bash
  # Test SSE event broadcast
  # Terminal 1: Listen to SSE
  curl -N http://localhost:3000/api/events

  # Terminal 2: Create credential
  curl -s -X POST http://localhost:3000/api/teams/test-team/credentials \
    -H "Content-Type: application/json" \
    -d '{"username": "sse-test-user"}'

  # Expected in Terminal 1: event: credentialCreated with credential data
  ```

  **Commit**: YES

  - Message: `feat(events): broadcast credential CRUD operations via SSE`
  - Files: `src/app/api/teams/[teamId]/credentials/route.ts`, `src/app/api/teams/[teamId]/credentials/[credentialId]/route.ts`, `src/app/api/teams/[teamId]/import/route.ts`
  - Pre-commit: `bun tsc --noEmit`

---

- [ ] 12. E2E Testing and Verification

  **What to do**:

  - Create Playwright E2E tests for all new features:
    - `tests/e2e/credential-scope.spec.ts` - Test 3-tier scope display and filtering
    - `tests/e2e/credential-autolink.spec.ts` - Test auto-link during import
    - `tests/e2e/credential-adhoc.spec.ts` - Test inline credential creation
    - `tests/e2e/credential-shared.spec.ts` - Test shared credential display and restrictions
    - `tests/e2e/credential-sync.spec.ts` - Test SSE real-time sync
  - Run full test suite and fix any regressions
  - Capture screenshots for evidence
  - Document any edge cases discovered

  **Must NOT do**:

  - Don't skip existing tests
  - Don't modify existing test assertions without reason
  - Don't test with real production data

  **Recommended Agent Profile**:

  - **Category**: `ultrabrain`
    - Reason: Comprehensive E2E testing with edge cases
  - **Skills**: [`dev-browser`, `playwright`]
    - `dev-browser`: For browser automation
    - `playwright`: For E2E test patterns

  **Parallelization**:

  - **Can Run In Parallel**: NO - Final verification
  - **Parallel Group**: None (sequential final task)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 9, 10, 11

  **References**:

  - `tests/e2e/*.spec.ts` - Existing test patterns
  - `playwright.config.ts` - Test configuration

  **Acceptance Criteria**:

  ```bash
  # Run all E2E tests
  npm test
  # Expected: All tests pass

  # Verify evidence screenshots exist
  ls -la .sisyphus/evidence/
  # Expected: Multiple .png files from test runs
  ```

  **Commit**: YES

  - Message: `test(e2e): add comprehensive tests for credential UX enhancements`
  - Files: `tests/e2e/credential-*.spec.ts`
  - Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message                                                                            | Files                                                | Verification         |
| ---------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------- |
| 1          | `feat(types): add 3-tier scope field to TeamCredential`                            | src/types/teamVault.ts                               | `bun tsc --noEmit`   |
| 2          | `refactor(storage): remove shared credential copying, use reference-based display` | src/utils/sharedStorage.ts, src/utils/teamStorage.ts | `bun tsc --noEmit`   |
| 3          | `feat(events): add SSE event infrastructure for credential CRUD`                   | src/utils/credentialEvents.ts                        | `bun tsc --noEmit`   |
| 4          | `feat(import): add auto-link for known account usernames`                          | src/app/api/teams/[teamId]/import/route.ts           | API tests            |
| 5          | `feat(api): add credential CRUD endpoints with SSE broadcast`                      | src/app/api/teams/[teamId]/credentials/\*.ts         | API tests            |
| 6          | `feat(ui): add inline credential editor with minimal required fields`              | src/app/components/InlineCredentialEditor.tsx        | Browser verification |
| 7          | `feat(ui): add auto-link preview to import modal`                                  | src/app/components/EnhancedImportModal.tsx           | Browser verification |
| 8          | `feat(hooks): add SSE listeners for credential CRUD events`                        | src/hooks/useConnection.ts                           | `bun tsc --noEmit`   |
| 9          | `feat(ui): add scope badges and inline editing to TeamVaultPanel`                  | src/app/components/TeamVaultPanel.tsx                | Browser verification |
| 10         | `feat(ui): add visual indicators for shared credentials in team view`              | src/app/components/TeamVaultPanel.tsx                | Browser verification |
| 11         | `feat(events): broadcast credential CRUD operations via SSE`                       | src/app/api/teams/[teamId]/\*.ts                     | SSE event tests      |
| 12         | `test(e2e): add comprehensive tests for credential UX enhancements`                | tests/e2e/credential-\*.spec.ts                      | `npm test`           |

---

## Success Criteria

### Functional Verification

- [ ] 3-tier scope badges display correctly (global/team-wide/vm-specific)
- [ ] Auto-link works: importing "admin" when "Admin" exists links instead of duplicates
- [ ] Can create credential with ONLY username
- [ ] Can create credential with ONLY hash
- [ ] Can create credential with ONLY password
- [ ] Shared credentials appear in team view with "Shared" indicator
- [ ] Shared credentials are read-only in team view
- [ ] All credential changes sync to other devices within 1 second
- [ ] Import preview shows which credentials will be linked vs created

### API Verification

```bash
# Credential CRUD
curl -s -X POST http://localhost:3000/api/teams/team1/credentials -d '{"username":"test"}'
curl -s http://localhost:3000/api/teams/team1/credentials/cred123
curl -s -X PUT http://localhost:3000/api/teams/team1/credentials/cred123 -d '{"password":"cracked"}'
curl -s -X DELETE http://localhost:3000/api/teams/team1/credentials/cred123

# Import with auto-link
curl -s -X POST http://localhost:3000/api/teams/team1/import -d '{"credentials":[...], "autoLink": true}'
```

### Performance Criteria

- [ ] Credential table loads < 2 seconds with 1000 credentials
- [ ] SSE events delivered within 1 second
- [ ] Auto-link preview updates within 500ms of input change
- [ ] Import of 100 credentials completes within 5 seconds

---

## Risk Mitigation

### Identified Risks

1. **Scope Model Migration**

   - Risk: Existing credentials lack `scope` field
   - Mitigation: Auto-derive scope from credentialType + vmIds on read
   - Fallback: Add database migration script if needed

2. **Auto-Link False Positives**

   - Risk: Links wrong credentials due to case-insensitive match
   - Mitigation: Match on username + hashType (not just username)
   - Fallback: Add "Undo link" or manual unlink feature

3. **SSE Event Volume**

   - Risk: Too many events during bulk import
   - Mitigation: Consider batching for imports > 50 credentials
   - Fallback: Debounce events on client side

4. **Reference Display Performance**
   - Risk: mergeSharedCredentials() slow with many shared credentials
   - Mitigation: Cache merged results, invalidate on changes
   - Fallback: Pagination for large credential sets

### Rollback Plan

If critical issues arise:

1. Revert scope field changes (keep credentialType as primary)
2. Disable auto-link via feature flag
3. Re-enable propagateSharedCredentialsToTeams() if reference display issues occur
4. Keep all commits atomic for easy selective revert

---

## Plan Summary

This work plan enhances credential management through 3 phases (12 tasks):

**Phase 1 (Foundation)**: Type updates, storage refactoring, SSE infrastructure
**Phase 2 (Core Features)**: Auto-link logic, CRUD endpoints, inline editor, import preview
**Phase 3 (Integration)**: SSE listeners, UI updates, shared indicators, E2E tests

Parallel execution across 3 waves reduces total time by ~35%. Critical path runs through type definitions, storage updates, auto-link logic, import preview, and final UI integration.

Key deliverables:

- 3-tier scope model (global | team-wide | vm-specific)
- Auto-linking known accounts during import
- Inline ad-hoc credential creation
- Reference-based shared credential display
- Real-time SSE sync for all credential operations
