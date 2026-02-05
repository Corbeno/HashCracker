# Draft: Credential UX Enhancement for CDC App

## User's Goal

Enhance the user experience for handling saved passwords for teams/VMs in a cyber defense competition app with:

1. Hierarchical credential management
2. Import modal enhancements for known accounts
3. Ad-hoc credential creation (inline, minimal fields)
4. Auto-sync across all devices via SSE
5. Hash cracking integration without data duplication

## Current Architecture Summary

### Data Model (from research)

```typescript
interface TeamCredential {
  id: string;
  hash: string;
  hashTypeId: number;
  hashTypeName: string;
  username: string | null;
  password: string | null;
  credentialType: 'shared' | 'tsi'; // Only 2 levels currently
  vmIds: string[]; // VM assignment (not scope)
  source: string | null;
  crackedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Storage

- Team vaults: `data/teams/{teamId}.json`
- Shared vault: `data/shared.json`
- VMs: `data/vms.json`

### Sync Mechanism

- SSE via `/api/events` with sendEventToAll()
- File watcher auto-syncs cracked.txt changes
- Events: teamVaultUpdate, teamSummariesUpdate, teamVaultsUpdated, crackedHashes

### Existing Modals

- EnhancedImportModal: Parser selection, VM assignment, credential type
- VmManager: Inline create/edit pattern (reusable)
- ImportHashesModal: Legacy import

## Gap Analysis (Current vs Requirements)

### 1. Hierarchical User Management

**CURRENT**: 2-tier (shared | tsi) + vmIds for VM assignment
**USER WANTS**: 3-tier hierarchy:

- ALL VMs, ALL teams (shared) → exists
- ALL VMs, ONE team (team-wide) → MISSING
- SPECIFIC VMs only (VM-specific) → vmIds exists but not as scope

**GAP**: Need to separate SCOPE (how broadly does this credential apply) from VM ASSIGNMENT (which specific VMs has it been tested/confirmed on)

### 2. Import Modal Enhancement

**CURRENT**: Parser selection, VM checkboxes, credential type radio
**USER WANTS**: Recognize known account usernames and "handle appropriately"

**GAP**: No username recognition or known-account linking

### 3. Ad-hoc Credential Creation

**CURRENT**: Only bulk import via modals
**USER WANTS**:

- Inline creation/editing in credential table
- Only ONE field required (username OR hash OR password)

**GAP**: No inline credential creation UI exists

### 4. Auto-Sync Across Devices

**CURRENT**: SSE syncs cracked hashes automatically
**USER WANTS**: ALL credential changes must sync

**GAP**: Credential create/update/delete doesn't broadcast via SSE

### 5. Hash Cracking Integration

**CURRENT**:

- Can crack from vault
- Results auto-sync to ALL teams
- But: Shared credentials COPIED to teams as 'tsi'

**USER WANTS**:

- Pick uncracked hashes to crack
- Avoid data duplication

**GAP**: Shared credentials are duplicated when propagated - need reference-based linking

## User Decisions (ALL CONFIRMED)

### 1. Credential Scope Hierarchy: **3-Tier Scope**

- Add `scope: 'global' | 'team-wide' | 'vm-specific'` field
- Global: ALL teams, ALL VMs (shared infrastructure)
- Team-wide: ONE team, ALL their VMs (team-discovered creds)
- VM-specific: Explicit VM list only
- Cleanly separates SCOPE from VM ASSIGNMENT (vmIds becomes "tested/confirmed on")

### 2. Known Account Recognition: **Auto-Link**

- Automatically associate imported hash with existing credential record
- Updates existing rather than creating duplicate
- Username matching (case-insensitive) triggers linking

### 3. Ad-hoc Creation: **All Equally Important**

- Support username-only, hash-only, password-only, or any combination
- All fields optional except at least ONE must be provided
- Equal prominence in UI - no hidden/collapsed fields

### 4. Duplication Strategy: **Reference-Based Display**

- Store shared credentials ONLY in `shared.json`
- Teams see them via merge at display time
- Single source of truth, NO copies to team vaults
- Remove propagateSharedCredentialsToTeams() copying behavior

### 5. Previous Plan Status: **Fully Implemented - NEW Work**

- VmManager, EnhancedImportModal, shared storage already exist and work
- This request is NEW enhancements on top of existing implementation
- Build incrementally on existing architecture

## Technical Decisions (CONFIRMED)

- [x] Credential scope model: 3-tier (global | team-wide | vm-specific)
- [x] Known account behavior: Auto-link during import
- [x] Required fields for ad-hoc: At least ONE of username/hash/password
- [x] Duplication avoidance: Reference-based display merge
- [x] Relationship to existing plan: Enhancement on top of completed work

## Research Findings

### SSE Event Pattern (from research)

```typescript
// To add credential change events:
sendEventToAll('credentialUpdated', {
  teamId: string;
  credential: TeamCredential;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: string;
});
```

### Inline Edit Pattern (from VmManager)

```typescript
const [isCreating, setIsCreating] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);
const [formData, setFormData] = useState<FormData>({...initial});

// Toggle creates modal, form handles both create/edit
{(isCreating || editingItem) && <Modal>...</Modal>}
```

### Import Modal Pattern (from EnhancedImportModal)

- Debounced parsing (500ms)
- Live preview with statistics
- VM checkboxes with scope indicators
- Credential type radio buttons

## Constraints (Non-Negotiable)

- Must use SSE (NO WebSockets)
- Must follow existing dark theme Tailwind patterns
- Must not break existing import functionality
- Must not change NTLM log parsing (already works well)
- File-based JSON storage must be preserved
