# Hash-Cracker CDC Transformation Work Plan

## TL;DR

Transform the existing Hash-Cracker application from a tab-based "Hash Cracker + Team Vault" interface into a CDC (Cyber Defense Competition)-focused credential management system where Team Vault is the main view with enhanced VM tracking, shared/TSI credential types, and pluggable hash parsing for NTLM logs.

**Deliverables:**

- New data models (VM, EnhancedTeamCredential, SharedCredentialsVault)
- File-based shared credentials storage (`data/shared.json`)
- Pluggable hash parser architecture with NTLM parsers
- VM management system (CRUD APIs + UI)
- Unified main view (no tabs, Team Vault always visible)
- Enhanced credential table with VM badges and credential type indicators
- "Crack" action button on credentials (secondary feature)

**Estimated Effort:** Large (6 phases, ~20-25 tasks)
**Parallel Execution:** YES - Multiple waves with independent tasks
**Critical Path:** Phase 1 → Phase 2 → Phase 3 (sequential) | Phase 4/5/6 can partially parallelize

---

## Context

### Current State

- **Framework**: Next.js 15.2 + TypeScript + Tailwind CSS
- **UI Pattern**: Tab-based navigation ("Hash Cracker" | "Team Vault")
- **Storage**: File-based JSON in `data/teams/{teamId}.json`
- **Team Vault**: Secondary feature with basic credential tracking
- **Hash Types**: 887 types with regex extraction
- **Components**: TeamVaultPanel, ImportHashesModal, YoinkHashesModal
- **APIs**: teams CRUD, import, sync, credentials management

### CDC Requirements

- **Shared Credentials**: Global vault accessible to all teams (`data/shared.json`)
- **TSI Credentials**: Per-team unique credentials (existing pattern)
- **VM Tracking**: Track which VMs each credential works on (global vs team-specific)
- **Enhanced Parsing**: Extract usernames AND hashes from NTLM logs (pwdump, NetNTLMv2)
- **UI Transformation**: Team Vault becomes main view, cracking becomes secondary action

### Research Findings

**Hash Formats to Support:**

- pwdump: `username:rid:LM_hash:NT_hash:::`
- NetNTLMv2: `DOMAIN\user::challenge:NTproof:LMproof`
- Mimikatz: Multi-line format with NTLM/SHA1/wdigest sections
- Filter machine accounts (names ending with `$`)
- Skip empty LM hashes (`aad3b435b51404eeaad3b435b51404ee`)

**CDC Patterns:**

- Blue Teams need isolated credential vaults
- Shared infrastructure credentials work across all teams
- VM tracking essential for service management
- Real-time compromise/rotation tracking

---

## Work Objectives

### Core Objective

Transform the Hash-Cracker into a CDC-focused credential management system with Team Vault as the primary interface, supporting shared/TSI credential types, VM tracking, and enhanced NTLM log parsing.

### Concrete Deliverables

1. **Data Models**: VM, EnhancedTeamCredential, SharedCredentialsVault TypeScript interfaces
2. **Storage Layer**: `data/shared.json` + updated `teamStorage.ts` for shared credentials
3. **VM Management**: CRUD APIs + VmManager component
4. **Parser Architecture**: Pluggable parser registry with NtlmLogParser implementation
5. **UI Transformation**: Unified main view (no tabs) with CredentialTable enhancements
6. **Cracking Integration**: "Crack" action buttons on individual credentials
7. **Enhanced Import**: Username extraction + VM assignment in import flow

### Definition of Done

- [ ] All existing Team Vault functionality preserved
- [ ] Shared credentials propagate to all team vaults automatically
- [ ] VM badges display on credentials with proper scope indicators
- [ ] NTLM log parsing extracts usernames and filters machine accounts
- [ ] No tab navigation - unified interface
- [ ] Crack action available on each credential row
- [ ] All acceptance criteria verified with automated tests/commands

### Must Have (Non-Negotiable)

- VM tracking with global/team-specific scope
- Shared credentials storage in `data/shared.json`
- Username extraction from NTLM logs
- Unified main view (no tabs)
- Pluggable parser architecture (extensible for future formats)
- Crack action on credentials

### Must NOT Have (Guardrails from Metis Review)

- No changes to hash cracking backend (hashcat integration stays as-is)
- No database migration (keep file-based storage)
- No authentication/authorization changes (out of scope)
- No breaking changes to existing API contracts

---

## Verification Strategy

### Test Infrastructure Assessment

- **Infrastructure exists**: YES - Project has test files in `/tests/`
- **Framework**: bun test (inferred from package.json scripts)
- **User wants tests**: TDD for data models, Manual verification for UI components

### Verification Approach by Task Type

**Data Model Tasks (Phase 1):**

- Type compilation check: `tsc --noEmit`
- Unit tests for type guards and transformations

**Storage/API Tasks (Phases 1-3):**

- API endpoint tests with curl/httpie
- File I/O verification with shell commands

**UI Tasks (Phases 4-5):**

- Visual verification via browser screenshots
- Component interaction testing

**Integration Tasks (Phase 6):**

- End-to-end workflow verification
- Full system test with sample data

---

## Execution Strategy

### Parallel Execution Waves

```
Phase 1: Foundation (Sequential - Must Complete First)
├── Task 1.1: Update TypeScript interfaces (TeamCredential, VM types)
├── Task 1.2: Create SharedCredentialsVault types
└── Task 1.3: Update storage utilities for shared credentials

Phase 2: VM Management (Can start after Phase 1 completes)
├── Task 2.1: Create VM data model and storage
├── Task 2.2: Build VM management APIs (CRUD)
└── Task 2.3: Create VmManager component

Phase 3: Parser Architecture (Can start after Phase 1 completes)
├── Task 3.1: Design parser registry interface
├── Task 3.2: Implement NtlmPwdumpParser
├── Task 3.3: Implement NtlmNetNtlmv2Parser
└── Task 3.4: Create parser API endpoints

Phase 4: UI Transformation (Depends on Phases 1-3)
├── Task 4.1: Redesign main page layout (remove tabs)
├── Task 4.2: Enhance CredentialTable with VM badges
└── Task 4.3: Create EnhancedImportModal with VM assignment

Phase 5: Integration (Depends on Phases 1-4)
├── Task 5.1: Add crack action to credentials
├── Task 5.2: Implement shared credentials propagation
└── Task 5.3: Wire up parser integration with import flow

Phase 6: Testing (Depends on all previous phases)
├── Task 6.1: Create test data (sample CDC logs)
├── Task 6.2: End-to-end workflow verification
└── Task 6.3: Performance testing with large credential sets
```

### Critical Path Analysis

**Critical Path (Longest Sequential Chain):**
Phase 1.1 → Phase 1.2 → Phase 1.3 → Phase 2.1 → Phase 4.1 → Phase 5.1 → Phase 6.2

**Parallel Opportunities:**

- Phase 2 (VMs) and Phase 3 (Parsers) can run in parallel after Phase 1
- Tasks within each phase are mostly independent (except noted dependencies)
- Phase 6 testing can begin as soon as individual components are ready

---

## Phase 1: Foundation (Data Models and Storage)

### Task 1.1: Update TypeScript Interfaces

**What to do:**

- Update `src/types/teamVault.ts` with new data models
- Add VM interface with scope ('global' | 'team-specific')
- Enhance TeamCredential with:
  - `username` field (rename from `label`)
  - `credentialType: 'shared' | 'tsi'`
  - `vmIds: string[]`
  - `source: string | null`
- Create SharedCredentialsVault interface
- Add type guards for new fields

**Files to modify:**

- `src/types/teamVault.ts` - Update existing types
- `src/types/index.ts` - Export new types

**Must NOT do:**

- Don't modify existing credential fields used by current APIs (keep backward compatibility)
- Don't remove the old `label` field yet (deprecation phase later)

**Recommended Agent Profile:**

- **Category**: `quick` - TypeScript type definitions are straightforward
- **Skills**: [`git-master`] - For clean type refactoring commits

**Parallelization:**

- **Can Run In Parallel**: NO - Must complete before other phases
- **Blocks**: Tasks 1.2, 1.3, and all Phase 2/3 tasks

**References:**

- Current types: `src/types/teamVault.ts` - Study existing TeamCredential structure
- Research: CDC credential patterns require VM tracking and shared/TSI distinction

**Acceptance Criteria:**

```bash
# TypeScript compilation passes
bun tsc --noEmit
# No type errors in src/types/teamVault.ts
grep -c "error TS" <(bun tsc --noEmit 2>&1) || echo "0 errors"
# Expected: 0
```

**Commit**: YES

- Message: `feat(types): add VM and enhanced credential types for CDC`
- Files: `src/types/teamVault.ts`, `src/types/index.ts`

---

### Task 1.2: Create Shared Credentials Storage

**What to do:**

- Create `data/shared.json` file structure for shared credentials
- Add storage utilities in `src/utils/sharedStorage.ts`:
  - `getSharedVault()` - Load shared credentials
  - `saveSharedVault(vault)` - Save shared credentials
  - `addSharedCredential(credential)` - Add with duplicate detection
  - `removeSharedCredential(id)` - Remove by ID
  - `updateSharedCredential(id, updates)` - Update fields
- Implement file locking or atomic writes for concurrent access
- Add shared credentials to sync workflow

**Files to create:**

- `src/utils/sharedStorage.ts` - New storage utilities

**Files to modify:**

- `src/utils/teamStorage.ts` - Add syncSharedToTeams function

**Must NOT do:**

- Don't change existing team storage file format
- Don't remove existing sync functionality

**Recommended Agent Profile:**

- **Category**: `quick` - File I/O operations similar to existing teamStorage.ts
- **Skills**: [`git-master`, `dev-browser`] - For storage logic and basic testing

**Parallelization:**

- **Can Run In Parallel**: YES with Task 1.1 (after types are defined)
- **Blocks**: Task 1.3
- **Depends on**: Task 1.1 (types must exist)

**References:**

- Pattern: `src/utils/teamStorage.ts` - Follow existing file I/O patterns
- Current sync: `src/app/api/teams/sync/route.ts` - Understand sync mechanism

**Acceptance Criteria:**

```bash
# Test shared storage operations
bun -e "
import { getSharedVault, addSharedCredential } from './src/utils/sharedStorage';
const vault = getSharedVault();
console.log('Shared vault loaded:', vault.credentials.length, 'credentials');
"
# Expected: Output shows 0 credentials initially

# Verify file creation
ls -la data/shared.json
# Expected: File exists
```

**Commit**: YES

- Message: `feat(storage): add shared credentials storage and utilities`
- Files: `src/utils/sharedStorage.ts`, `data/shared.json` (template)

---

### Task 1.3: Update Team Storage for Enhanced Credentials

**What to do:**

- Update `src/utils/teamStorage.ts` to support new credential fields
- Add functions:
  - `updateCredentialVMs(teamId, credentialId, vmIds)` - Update VM assignments
  - `updateCredentialType(teamId, credentialId, type)` - Change shared/tsi type
  - `getCredentialsByVM(teamId, vmId)` - Filter credentials by VM
  - `mergeSharedCredentials(teamId)` - Inject shared creds into team view
- Update `addHashesToTeam` to handle new fields (username extraction, source tracking)
- Maintain backward compatibility with old credential format

**Files to modify:**

- `src/utils/teamStorage.ts` - Add new functions

**Must NOT do:**

- Don't break existing credential CRUD operations
- Don't change file format without migration path

**Recommended Agent Profile:**

- **Category**: `quick` - Extending existing utilities
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: NO - Must complete after 1.1 and 1.2
- **Blocks**: Phase 2, Phase 3, Phase 4
- **Depends on**: Tasks 1.1, 1.2

**References:**

- Current storage: `src/utils/teamStorage.ts:1-250` - Understand existing patterns
- Team vault format: `data/teams/*.json` - See current structure

**Acceptance Criteria:**

```bash
# Test enhanced storage functions
bun -e "
import { getTeamVault, updateCredentialVMs } from './src/utils/teamStorage';
// Test with existing team if available
const vault = getTeamVault('team1');
console.log('Team vault loaded:', vault.credentials.length, 'credentials');
"
# Expected: Output shows credential count
```

**Commit**: YES

- Message: `feat(storage): add VM tracking and credential type utilities`
- Files: `src/utils/teamStorage.ts`

---

## Phase 2: VM Management (VM System)

### Task 2.1: Create VM Data Model and Storage

**What to do:**

- Define VM interface in `src/types/vm.ts`:
  ```typescript
  interface VM {
    id: string;
    name: string;
    scope: 'global' | 'team-specific';
    teamId?: string; // Only for team-specific
    ipAddress?: string;
    osType?: 'windows' | 'linux' | 'network';
    description?: string;
  }
  ```
- Create VM storage utilities in `src/utils/vmStorage.ts`:
  - `listVMs(scope?)` - List all VMs or filter by scope
  - `getVM(id)` - Get single VM
  - `createVM(vm)` - Create new VM
  - `updateVM(id, updates)` - Update VM fields
  - `deleteVM(id)` - Delete VM
  - `getVMsForTeam(teamId)` - Get global + team-specific VMs
- Store VMs in `data/vms.json` (single file for simplicity)

**Files to create:**

- `src/types/vm.ts` - VM type definitions
- `src/utils/vmStorage.ts` - VM storage utilities
- `data/vms.json` - VM data file (initial empty array)

**Must NOT do:**

- Don't create separate files per VM (keep it simple)
- Don't add complex VM relationship tracking (out of scope)

**Recommended Agent Profile:**

- **Category**: `quick` - Similar to teamStorage.ts pattern
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: YES with Phase 3 (after Phase 1 completes)
- **Blocks**: Task 2.2, Task 4.2 (CredentialTable)

**References:**

- Pattern: `src/utils/teamStorage.ts` - Follow existing file-based storage
- Types: `src/types/teamVault.ts` - Consistent type definition style

**Acceptance Criteria:**

```bash
# Test VM storage
bun -e "
import { createVM, listVMs } from './src/utils/vmStorage';
const vm = createVM({
  id: 'dc01',
  name: 'Domain Controller 01',
  scope: 'global',
  osType: 'windows'
});
console.log('Created VM:', vm.id);
console.log('All VMs:', listVMs().length);
"
# Expected: Created VM, count = 1

# Verify file
ls -la data/vms.json && cat data/vms.json
# Expected: File exists with VM data
```

**Commit**: YES

- Message: `feat(vm): add VM data model and storage utilities`
- Files: `src/types/vm.ts`, `src/utils/vmStorage.ts`, `data/vms.json`

---

### Task 2.2: Build VM Management APIs

**What to do:**

- Create API routes for VM CRUD:
  - `GET /api/vms` - List all VMs (query: `?scope=global|team-specific`)
  - `POST /api/vms` - Create new VM
  - `GET /api/vms/[vmId]` - Get single VM
  - `PUT /api/vms/[vmId]` - Update VM
  - `DELETE /api/vms/[vmId]` - Delete VM
  - `GET /api/vms/for-team/[teamId]` - Get VMs visible to team
- Add input validation for VM data
- Return appropriate HTTP status codes
- Handle errors with descriptive messages

**Files to create:**

- `src/app/api/vms/route.ts` - List and create VMs
- `src/app/api/vms/[vmId]/route.ts` - Single VM operations
- `src/app/api/vms/for-team/[teamId]/route.ts` - Team VM visibility

**Must NOT do:**

- Don't add authentication checks (out of scope)
- Don't implement complex filtering (basic scope filter only)

**Recommended Agent Profile:**

- **Category**: `quick` - API routes following existing patterns
- **Skills**: [`git-master`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: YES with Task 3.x (Phase 3 parsers)
- **Blocks**: Task 2.3 (VmManager component)
- **Depends on**: Task 2.1

**References:**

- Pattern: `src/app/api/teams/route.ts` - Follow existing API structure
- Storage: `src/utils/vmStorage.ts` (Task 2.1)

**Acceptance Criteria:**

```bash
# Test VM APIs
curl -s -X POST http://localhost:3000/api/vms \
  -H "Content-Type: application/json" \
  -d '{"id":"web01","name":"Web Server 01","scope":"global","osType":"linux"}' \
  | jq '.vm.id'
# Expected: "web01"

curl -s http://localhost:3000/api/vms | jq '.vms | length'
# Expected: 1 (or more if test VM created)
```

**Commit**: YES

- Message: `feat(api): add VM management endpoints`
- Files: `src/app/api/vms/route.ts`, `src/app/api/vms/[vmId]/route.ts`, etc.

---

### Task 2.3: Create VmManager Component

**What to do:**

- Create `src/app/components/VmManager.tsx`:
  - VM list with scope badges (Global/Team-Specific)
  - Add VM form (id, name, scope, team select if team-specific, OS type, IP)
  - Edit VM inline or modal
  - Delete VM with confirmation
  - Filter by scope
- Use existing UI patterns from TeamVaultPanel
- Integrate with VM APIs
- Show VM usage count (how many credentials reference each VM)

**Files to create:**

- `src/app/components/VmManager.tsx` - VM management UI
- `src/app/components/VmBadge.tsx` - Reusable VM badge component

**Files to modify:**

- `src/app/page.tsx` - Add VmManager to main view (as modal or panel)

**Must NOT do:**

- Don't create complex VM relationship diagrams (out of scope)
- Don't add VM health checking (out of scope)

**Recommended Agent Profile:**

- **Category**: `visual-engineering` - UI component development
- **Skills**: [`frontend-ui-ux`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Must wait for APIs
- **Blocks**: Task 4.2 (CredentialTable VM badges)
- **Depends on**: Tasks 2.1, 2.2

**References:**

- Pattern: `src/app/components/TeamVaultPanel.tsx` - Similar list + form pattern
- Badge style: Existing badge components in codebase
- API usage: `src/app/api/vms/*` (Task 2.2)

**Acceptance Criteria:**

```
# Visual verification via browser (using playwright skill):
1. Navigate to: http://localhost:3000
2. Open VM Manager (via button/menu)
3. Create test VM:
   - Enter ID: "test-vm-01"
   - Enter Name: "Test VM"
   - Select Scope: "global"
4. Click Save
5. Assert: VM appears in list with "Global" badge
6. Screenshot: .sisyphus/evidence/vm-manager-created.png
```

**Commit**: YES

- Message: `feat(ui): add VmManager component for VM CRUD operations`
- Files: `src/app/components/VmManager.tsx`, `src/app/components/VmBadge.tsx`

---

## Phase 3: Parser Architecture (Extensible Hash Parsers)

### Task 3.1: Design Parser Registry Interface

**What to do:**

- Create parser architecture in `src/utils/parsers/`:

  ```typescript
  // src/utils/parsers/types.ts
  interface ParsedCredential {
    username: string | null;
    hash: string;
    hashTypeId: number;
    hashTypeName: string;
    metadata?: Record<string, any>;
  }

  interface LogParser {
    id: string;
    name: string;
    description: string;
    supportedFormats: string[];
    parse(input: string): ParsedCredential[];
  }
  ```

- Create parser registry in `src/utils/parsers/registry.ts`:
  - `registerParser(parser)` - Add parser to registry
  - `getParser(id)` - Get parser by ID
  - `listParsers()` - List all registered parsers
  - `parseWithParser(parserId, input)` - Parse using specific parser
  - `autoParse(input)` - Try all parsers, return best results
- Create base parser class/utility for common operations

**Files to create:**

- `src/utils/parsers/types.ts` - Parser type definitions
- `src/utils/parsers/registry.ts` - Parser registry
- `src/utils/parsers/base.ts` - Base parser utilities (machine account filtering, etc.)

**Must NOT do:**

- Don't make parsers singletons (allow multiple instances)
- Don't add parser persistence (in-memory only)

**Recommended Agent Profile:**

- **Category**: `ultrabrain` - Architecture design for extensibility
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: YES with Phase 2 (after Phase 1)
- **Blocks**: Tasks 3.2, 3.3, 3.4

**References:**

- Pattern: Plugin architecture in other TypeScript projects
- Requirement: Must support pwdump and NetNTLMv2 initially, extensible for future

**Acceptance Criteria:**

```bash
# Test parser registry
bun -e "
import { createRegistry } from './src/utils/parsers/registry';
const registry = createRegistry();
console.log('Registry created:', !!registry);
console.log('Parsers count:', registry.listParsers().length);
"
# Expected: Registry created: true, count: 0 (initially)
```

**Commit**: YES

- Message: `feat(parser): create pluggable parser registry architecture`
- Files: `src/utils/parsers/types.ts`, `src/utils/parsers/registry.ts`, `src/utils/parsers/base.ts`

---

### Task 3.2: Implement NtlmPwdumpParser

**What to do:**

- Create `src/utils/parsers/NtlmPwdumpParser.ts`:
  - Parse pwdump format: `username:rid:LM_hash:NT_hash:::`
  - Extract username from first field
  - Extract NT hash (4th field)
  - Filter out machine accounts (username ends with `$`)
  - Skip empty LM hashes (`aad3b435b51404eeaad3b435b51404ee`)
  - Return hashcat mode 1000 (NTLM)
  - Handle multiple lines
  - Validate hash format (32 hex chars)
- Register parser in registry

**Files to create:**

- `src/utils/parsers/NtlmPwdumpParser.ts` - Pwdump parser implementation

**Files to modify:**

- `src/utils/parsers/registry.ts` - Auto-register on import

**Must NOT do:**

- Don't parse LM hashes (deprecated, always empty)
- Don't include machine accounts in results

**Recommended Agent Profile:**

- **Category**: `quick` - Parser implementation with regex
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: YES with Task 3.3
- **Blocks**: Task 3.4 (parser API)
- **Depends on**: Task 3.1

**References:**

- Format spec: pwdump `username:rid:LM_hash:NT_hash:::`
- Hashcat mode: 1000 for NTLM
- Filter: Machine accounts end with `$`
- Filter: Empty LM hash is `aad3b435b51404eeaad3b435b51404ee`

**Acceptance Criteria:**

```bash
# Test pwdump parser
bun -e "
import { NtlmPwdumpParser } from './src/utils/parsers/NtlmPwdumpParser';
const parser = new NtlmPwdumpParser();
const input = \`Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
 john.smith:1010:aad3b435b51404eeaad3b435b51404ee:b4b9b02e6f09a9bd760f388b67351e2b:::
 WORKSTATION01\$:1011:aad3b435b51404eeaad3b435b51404ee:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:::\`;
const results = parser.parse(input);
console.log('Parsed credentials:', results.length);
console.log('First user:', results[0]?.username);
console.log('Machine accounts filtered:', results.filter(r => r.username?.endsWith('\$')).length);
"
# Expected: 2 credentials (Admin, john.smith), WORKSTATION01$ filtered
```

**Commit**: YES

- Message: `feat(parser): add NTLM pwdump parser with username extraction`
- Files: `src/utils/parsers/NtlmPwdumpParser.ts`

---

### Task 3.3: Implement NtlmNetNtlmv2Parser

**What to do:**

- Create `src/utils/parsers/NtlmNetNtlmv2Parser.ts`:
  - Parse NetNTLMv2 format: `DOMAIN\user::challenge:NTproof:LMproof`
  - Extract username from `DOMAIN\user` or `user@domain`
  - Extract response hash
  - Handle variations in format
  - Return appropriate hash type (NetNTLMv2 is hashcat mode 5600)
  - Handle multiple entries
  - Validate hash components

**Files to create:**

- `src/utils/parsers/NtlmNetNtlmv2Parser.ts` - NetNTLMv2 parser

**Files to modify:**

- `src/utils/parsers/registry.ts` - Auto-register

**Must NOT do:**

- Don't implement full NTLMSSP parsing (out of scope)
- Don't handle NetNTLMv1 (different format)

**Recommended Agent Profile:**

- **Category**: `quick` - Similar to pwdump parser
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: YES with Task 3.2
- **Blocks**: Task 3.4
- **Depends on**: Task 3.1

**References:**

- Format: `DOMAIN\user::challenge:NTproof:LMproof` or `user::domain:challenge:NTproof:LMproof`
- Hashcat mode: 5600 for NetNTLMv2

**Acceptance Criteria:**

```bash
# Test NetNTLMv2 parser
bun -e "
import { NtlmNetNtlmv2Parser } from './src/utils/parsers/NtlmNetNtlmv2Parser';
const parser = new NtlmNetNtlmv2Parser();
const input = 'ACME\\\\john.smith::c4b6c7d8e9f0a1b2:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:0102030405060708';
const results = parser.parse(input);
console.log('Parsed:', results.length, 'credentials');
console.log('Username:', results[0]?.username);
"
# Expected: 1 credential, username: john.smith (or ACME\john.smith)
```

**Commit**: YES

- Message: `feat(parser): add NetNTLMv2 parser for network auth hashes`
- Files: `src/utils/parsers/NtlmNetNtlmv2Parser.ts`

---

### Task 3.4: Create Parser API Endpoints

**What to do:**

- Create API routes for parser operations:
  - `GET /api/parsers` - List available parsers with metadata
  - `POST /api/parsers/parse` - Parse text with specific parser
    - Body: `{ parserId: string, text: string }`
    - Response: `{ credentials: ParsedCredential[], parser: string, count: number }`
  - `POST /api/parsers/auto-parse` - Auto-detect and parse
    - Body: `{ text: string }`
    - Response: `{ credentials: ParsedCredential[], parserUsed: string, count: number }`
- Integrate with existing import flow (enhance later in Phase 5)

**Files to create:**

- `src/app/api/parsers/route.ts` - List parsers
- `src/app/api/parsers/parse/route.ts` - Parse endpoint
- `src/app/api/parsers/auto-parse/route.ts` - Auto-parse endpoint

**Must NOT do:**

- Don't add parser management APIs (create/delete parsers - static only)
- Don't persist parser results (stateless)

**Recommended Agent Profile:**

- **Category**: `quick` - API routes
- **Skills**: [`git-master`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Must wait for parsers
- **Blocks**: Task 5.3 (integration with import)
- **Depends on**: Tasks 3.1, 3.2, 3.3

**References:**

- Pattern: `src/app/api/extract-hashes/route.ts` - Similar text parsing API
- Parsers: `src/utils/parsers/*.ts` (Tasks 3.2, 3.3)

**Acceptance Criteria:**

```bash
# Test parser APIs
curl -s http://localhost:3000/api/parsers | jq '.parsers | length'
# Expected: 2 (pwdump, netntlmv2)

curl -s -X POST http://localhost:3000/api/parsers/parse \
  -H "Content-Type: application/json" \
  -d '{"parserId":"ntlm-pwdump","text":"Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::"}' \
  | jq '.credentials | length'
# Expected: 1
```

**Commit**: YES

- Message: `feat(api): add parser registry endpoints`
- Files: `src/app/api/parsers/route.ts`, `src/app/api/parsers/parse/route.ts`, etc.

---

## Phase 4: UI Transformation (Main View Redesign)

### Task 4.1: Redesign Main Page Layout (Remove Tabs)

**What to do:**

- Redesign `src/app/page.tsx`:
  - Remove "Hash Cracker" / "Team Vault" tab navigation
  - Make Team Vault the always-visible main interface
  - Move hash cracking to a secondary action (modal or side panel)
  - Keep essential hash input accessible but not dominant
  - Responsive layout: Team Vault full width, cracking actions accessible
- Create new layout structure:
  - Header with app title and actions
  - Main area: Team Vault panel (full width)
  - Side panel or modal: Hash cracking interface
- Preserve all existing functionality

**Files to modify:**

- `src/app/page.tsx` - Complete redesign

**Must NOT do:**

- Don't remove hash cracking functionality (just change prominence)
- Don't break existing state management hooks

**Recommended Agent Profile:**

- **Category**: `visual-engineering` - Major UI redesign
- **Skills**: [`frontend-ui-ux`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Major UI change
- **Blocks**: Tasks 4.2, 4.3, 5.1
- **Depends on**: Phases 1-3 (types, storage, VMs, parsers ready)

**References:**

- Current page: `src/app/page.tsx` - Study existing structure
- Pattern: Dashboard layouts from CDC research
- Component: `src/app/components/TeamVaultPanel.tsx` - Main content

**Acceptance Criteria:**

```
# Visual verification:
1. Navigate to: http://localhost:3000
2. Assert: No "Hash Cracker" / "Team Vault" tabs visible
3. Assert: Team Vault panel visible immediately
4. Assert: Hash cracking accessible via button/menu (not hidden)
5. Screenshot: .sisyphus/evidence/main-layout-redesign.png
```

**Commit**: YES

- Message: `feat(ui): redesign main layout - Team Vault as primary view`
- Files: `src/app/page.tsx`

---

### Task 4.2: Enhance CredentialTable with VM Badges

**What to do:**

- Enhance `src/app/components/TeamVaultPanel.tsx` credential table:
  - Add VM badges column showing which VMs credential works on
  - Use color coding: Global VMs (blue), Team-specific VMs (green)
  - Show credential type badge: Shared (purple), TSI (orange)
  - Add username column (separate from hash display)
  - Add source column (log file, manual, etc.) with tooltip
  - Add filter controls: By VM, By Type, By Source
  - Keep existing: Password status, Crack action, Copy buttons
- Create VM badge component with hover tooltip
- Update table styling for new columns

**Files to modify:**

- `src/app/components/TeamVaultPanel.tsx` - Enhance table
- `src/app/components/CredentialTable.tsx` (or create new)

**Files to create:**

- `src/app/components/CredentialTypeBadge.tsx` - Shared/TSI indicator

**Must NOT do:**

- Don't remove existing credential actions (delete, copy hash)
- Don't break existing table sorting/filtering

**Recommended Agent Profile:**

- **Category**: `visual-engineering` - Table UI enhancements
- **Skills**: [`frontend-ui-ux`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Extends Task 4.1
- **Blocks**: Task 5.1 (crack action)
- **Depends on**: Tasks 4.1, 2.3 (VMs)

**References:**

- Current table: `src/app/components/TeamVaultPanel.tsx:200-350` - Credential display section
- Badge pattern: `src/app/components/VmBadge.tsx` (Task 2.3)
- VM data: `src/utils/vmStorage.ts` (Task 2.1)

**Acceptance Criteria:**

```
# Visual verification:
1. Navigate to: http://localhost:3000
2. Select a team with credentials
3. Assert: Credentials table shows:
   - Username column
   - Hash column
   - VM badges (colored by scope)
   - Type badge (Shared/TSI)
   - Source indicator
4. Hover on VM badge → tooltip shows VM name
5. Screenshot: .sisyphus/evidence/credential-table-enhanced.png
```

**Commit**: YES

- Message: `feat(ui): enhance credential table with VM and type badges`
- Files: `src/app/components/TeamVaultPanel.tsx`, `src/app/components/CredentialTypeBadge.tsx`

---

### Task 4.3: Create EnhancedImportModal

**What to do:**

- Create `src/app/components/EnhancedImportModal.tsx` (or modify existing):
  - Extend `ImportHashesModal` or create new component
  - Add parser selection dropdown (pwdump, NetNTLMv2, auto-detect)
  - Show extracted usernames alongside hashes in preview
  - Add VM assignment section:
    - Multi-select dropdown for VMs
    - "Apply to all" option
    - Show VM scope indicators
  - Display credential type selection (shared/tsi)
  - Show parsing statistics: total lines, valid credentials, machine accounts filtered
  - Real-time preview with parser selection

**Files to create/modify:**

- `src/app/components/EnhancedImportModal.tsx` - New enhanced modal
- OR modify: `src/app/components/ImportHashesModal.tsx`

**Must NOT do:**

- Don't remove existing import functionality (backward compatible)
- Don't break YoinkHashesModal (keep separate for now)

**Recommended Agent Profile:**

- **Category**: `visual-engineering` - Complex modal with multiple inputs
- **Skills**: [`frontend-ui-ux`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Depends on parser APIs
- **Blocks**: Task 5.3 (integration)
- **Depends on**: Tasks 3.4 (parser APIs), 2.2 (VM APIs)

**References:**

- Pattern: `src/app/components/ImportHashesModal.tsx` - Existing import UI
- Parser APIs: `src/app/api/parsers/*` (Task 3.4)
- VM APIs: `src/app/api/vms/*` (Task 2.2)

**Acceptance Criteria:**

```
# Visual verification:
1. Open EnhancedImportModal
2. Paste pwdump format text
3. Select Parser: "NTLM Pwdump"
4. Assert: Preview shows extracted usernames
5. Assert: Machine accounts (ending with $) are filtered
6. Select VM assignment
7. Select Credential Type: "TSI"
8. Import
9. Assert: Credentials appear in team vault with correct VM/type
10. Screenshot: .sisyphus/evidence/enhanced-import.png
```

**Commit**: YES

- Message: `feat(ui): create EnhancedImportModal with parser and VM selection`
- Files: `src/app/components/EnhancedImportModal.tsx`

---

## Phase 5: Integration (Cracking as Secondary Action)

### Task 5.1: Add Crack Action to Credentials

**What to do:**

- Add "Crack" action button to each credential row in TeamVaultPanel:
  - Button appears on hover or always visible (design decision)
  - Click opens crack modal or initiates crack job directly
  - Pre-populate hash type from credential
  - Show attack mode selection
  - Display crack progress inline or in ActiveJobsPanel
  - Auto-sync result back to credential when cracked
- Create `src/app/components/CrackCredentialModal.tsx`:
  - Single credential crack interface
  - Attack mode dropdown
  - Submit button
  - Progress indicator
- Update credential row to show crack status

**Files to create:**

- `src/app/components/CrackCredentialModal.tsx` - Single credential crack UI

**Files to modify:**

- `src/app/components/TeamVaultPanel.tsx` - Add crack action to rows
- `src/app/api/crack/route.ts` - Support single hash cracking (if needed)

**Must NOT do:**

- Don't remove bulk crack functionality (keep "Crack All" option)
- Don't change hashcat execution logic

**Recommended Agent Profile:**

- **Category**: `visual-engineering` - UI integration
- **Skills**: [`frontend-ui-ux`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - UI integration
- **Blocks**: None
- **Depends on**: Task 4.2 (enhanced table)

**References:**

- Existing crack: `src/app/api/crack/route.ts` - Hash cracking API
- Pattern: `src/app/components/HashInputForm.tsx` - Crack form design
- Sync: `src/app/api/teams/sync/route.ts` - Result sync mechanism

**Acceptance Criteria:**

```
# Visual verification:
1. Navigate to team vault
2. Find uncracked credential
3. Click "Crack" button on credential row
4. Select attack mode
5. Submit
6. Assert: Job appears in ActiveJobsPanel
7. Wait for completion (or mock completion)
8. Assert: Credential shows password when cracked
9. Screenshot: .sisyphus/evidence/crack-action.png
```

**Commit**: YES

- Message: `feat(ui): add crack action button to individual credentials`
- Files: `src/app/components/CrackCredentialModal.tsx`, `src/app/components/TeamVaultPanel.tsx`

---

### Task 5.2: Implement Shared Credentials Propagation

**What to do:**

- Implement shared credentials auto-propagation:
  - When shared credential added/updated in `data/shared.json`
  - Automatically add/update in all team vaults
  - Mark as `credentialType: 'shared'` in team vaults
  - Preserve VM assignments from shared credential
  - Handle deletion: Remove from all team vaults when deleted from shared
- Add sync endpoint: `POST /api/shared/sync-to-teams`
  - Manual sync trigger
  - Returns teams updated count
- Update team vault GET to include shared credentials:
  - Merge team TSI credentials + shared credentials
  - Deduplicate by hash (team TSI takes precedence over shared)

**Files to modify:**

- `src/utils/sharedStorage.ts` - Add propagation logic
- `src/utils/teamStorage.ts` - Add mergeSharedCredentials function
- Create: `src/app/api/shared/sync-to-teams/route.ts` - Sync endpoint

**Must NOT do:**

- Don't duplicate shared credentials in team files (reference pattern)
- Don't allow teams to edit shared credentials

**Recommended Agent Profile:**

- **Category**: `ultrabrain` - Complex data synchronization logic
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: NO - Core integration logic
- **Blocks**: None (can run after Phase 4)
- **Depends on**: Tasks 1.2, 1.3 (shared storage, team storage)

**References:**

- Pattern: `src/app/api/teams/sync/route.ts` - Existing sync mechanism
- Storage: `src/utils/sharedStorage.ts` (Task 1.2)
- Storage: `src/utils/teamStorage.ts` (Task 1.3)

**Acceptance Criteria:**

```bash
# Test shared credential propagation
# 1. Add shared credential
bun -e "
import { addSharedCredential } from './src/utils/sharedStorage';
addSharedCredential({
  id: 'shared-test',
  hash: 'b4b9b02e6f09a9bd760f388b67351e2b',
  hashTypeId: 1000,
  hashTypeName: 'NTLM',
  username: 'sharedadmin',
  credentialType: 'shared',
  vmIds: ['dc01']
});
"

# 2. Check team vault includes shared credential
curl -s http://localhost:3000/api/teams/team1 | jq '.credentials | map(select(.credentialType == \"shared\")) | length'
# Expected: 1 (or more if other shared creds exist)
```

**Commit**: YES

- Message: `feat(integration): implement shared credentials auto-propagation to teams`
- Files: `src/utils/sharedStorage.ts`, `src/app/api/shared/sync-to-teams/route.ts`

---

### Task 5.3: Wire Up Parser Integration with Import Flow

**What to do:**

- Integrate parser APIs with EnhancedImportModal:
  - Replace existing hash extraction with parser-based extraction
  - Support parser selection (auto-detect or manual)
  - Extract usernames and display in preview
  - Filter machine accounts automatically
  - Map parsed credentials to team credential format
- Update `POST /api/teams/[teamId]/import`:
  - Accept `parserId` parameter
  - Accept `vmIds` parameter
  - Accept `credentialType` parameter
  - Use parser registry for extraction
  - Save credentials with all new fields
- Ensure backward compatibility with old import format

**Files to modify:**

- `src/app/api/teams/[teamId]/import/route.ts` - Enhance import endpoint
- `src/app/components/EnhancedImportModal.tsx` - Wire up to API

**Must NOT do:**

- Don't break existing import API (backward compatible)
- Don't remove old regex-based extraction (keep as fallback)

**Recommended Agent Profile:**

- **Category**: `ultrabrain` - Integration of multiple systems
- **Skills**: [`git-master`, `dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: NO - Final integration
- **Blocks**: None
- **Depends on**: Tasks 3.4 (parser APIs), 4.3 (EnhancedImportModal)

**References:**

- Import API: `src/app/api/teams/[teamId]/import/route.ts` - Current implementation
- Parser APIs: `src/app/api/parsers/*` (Task 3.4)
- Modal: `src/app/components/EnhancedImportModal.tsx` (Task 4.3)

**Acceptance Criteria:**

```bash
# Test enhanced import with parser
curl -s -X POST http://localhost:3000/api/teams/team1/import \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::",
    "parserId": "ntlm-pwdump",
    "vmIds": ["dc01"],
    "credentialType": "tsi"
  }' \
  | jq '.imported'
# Expected: 1

# Verify credential has username and VM
curl -s http://localhost:3000/api/teams/team1 | jq '.credentials | map(select(.username == "Administrator")) | .[0].vmIds'
# Expected: ["dc01"]
```

**Commit**: YES

- Message: `feat(integration): wire up parser registry with import workflow`
- Files: `src/app/api/teams/[teamId]/import/route.ts`, `src/app/components/EnhancedImportModal.tsx`

---

## Phase 6: Testing & Verification

### Task 6.1: Create Test Data (Sample CDC Logs)

**What to do:**

- Create test data files for CDC scenarios:
  - `tests/data/pwdump-sample.txt` - Sample pwdump output
  - `tests/data/netntlmv2-sample.txt` - Sample NetNTLMv2 captures
  - `tests/data/mimikatz-sample.txt` - Sample mimikatz output
- Include realistic CDC scenarios:
  - Domain admin accounts
  - Service accounts
  - Machine accounts (to test filtering)
  - Empty LM hashes
  - Mixed shared/TSI credentials
- Create test configuration:
  - Sample VMs (global and team-specific)
  - Sample teams
  - Sample shared credentials
- Document expected parsing results

**Files to create:**

- `tests/data/pwdump-sample.txt`
- `tests/data/netntlmv2-sample.txt`
- `tests/data/mimikatz-sample.txt`
- `tests/data/test-config.json` - Test setup

**Must NOT do:**

- Don't use real credentials from actual CDC events
- Don't commit sensitive data (use fake/test data only)

**Recommended Agent Profile:**

- **Category**: `writing` - Test data creation
- **Skills**: [`git-master`]

**Parallelization:**

- **Can Run In Parallel**: YES with Phase 5 tasks
- **Blocks**: Task 6.2

**References:**

- Format specs: Research findings on pwdump, NetNTLMv2 formats
- CDC patterns: Shared infrastructure vs team-specific

**Acceptance Criteria:**

```bash
# Verify test data exists
ls -la tests/data/
# Expected: pwdump-sample.txt, netntlmv2-sample.txt, mimikatz-sample.txt

# Test parser with sample data
bun -e "
import { NtlmPwdumpParser } from './src/utils/parsers/NtlmPwdumpParser';
import { readFileSync } from 'fs';
const input = readFileSync('./tests/data/pwdump-sample.txt', 'utf8');
const parser = new NtlmPwdumpParser();
const results = parser.parse(input);
console.log('Parsed', results.length, 'credentials from sample');
"
# Expected: Non-zero count, no errors
```

**Commit**: YES

- Message: `test(data): add CDC sample logs for testing`
- Files: `tests/data/*`

---

### Task 6.2: End-to-End Workflow Verification

**What to do:**

- Execute complete CDC workflow:
  1. Create test VMs (global and team-specific)
  2. Create test team
  3. Import credentials from sample log using parser
  4. Verify VM assignment
  5. Verify credential type (TSI)
  6. Add shared credential
  7. Verify propagation to team vault
  8. Crack a credential
  9. Verify password appears
  10. Test filters (by VM, by type)
- Document any issues or edge cases
- Verify UI renders correctly at each step

**Files to test:**

- All created/modified files from Phases 1-5

**Must NOT do:**

- Don't run actual hashcat (mock cracking for speed)
- Don't test with real production data

**Recommended Agent Profile:**

- **Category**: `ultrabrain` - Complex system testing
- **Skills**: [`dev-browser`, `git-master`]

**Parallelization:**

- **Can Run In Parallel**: NO - Requires all previous tasks
- **Blocks**: Task 6.3
- **Depends on**: All Phase 1-5 tasks, Task 6.1

**References:**

- Test data: `tests/data/*` (Task 6.1)
- APIs: All endpoints from Phases 2-3
- UI: All components from Phases 4-5

**Acceptance Criteria:**

```
# Automated E2E verification checklist:
1. Setup: bun run test:e2e:setup
2. Execute: bun run test:e2e:cdc-workflow
3. Assert: All 10 workflow steps pass
4. Evidence: Screenshots saved to .sisyphus/evidence/e2e-*.png

# Or manual verification via browser:
1. Navigate to app
2. Execute each workflow step
3. Verify UI state after each action
4. Document results
```

**Commit**: NO - Testing doesn't modify code

---

### Task 6.3: Performance Testing with Large Credential Sets

**What to do:**

- Test performance with CDC-scale data:
  - Generate 1000+ credentials per team
  - Generate 100+ shared credentials
  - Test with 20+ teams
  - Measure load times
  - Test parser performance with large log files (10MB+)
- Identify bottlenecks:
  - File I/O operations
  - UI rendering (pagination needed?)
  - API response times
  - Memory usage
- Document performance characteristics
- Add pagination if needed for credential tables

**Files to test:**

- `src/utils/teamStorage.ts` - Bulk operations
- `src/utils/sharedStorage.ts` - Sync operations
- `src/app/components/TeamVaultPanel.tsx` - Rendering performance
- `src/utils/parsers/*.ts` - Parsing performance

**Must NOT do:**

- Don't optimize prematurely (measure first)
- Don't add pagination unless needed (test with real data volumes)

**Recommended Agent Profile:**

- **Category**: `ultrabrain` - Performance analysis
- **Skills**: [`dev-browser`]

**Parallelization:**

- **Can Run In Parallel**: YES with Task 6.2 (after Phase 5)
- **Blocks**: None (final task)

**References:**

- Performance baseline: Test with current implementation
- CDC scale: 10-50 teams, 100-1000 credentials per team

**Acceptance Criteria:**

```bash
# Performance test script
bun run test:performance
# Expected: Output with timing metrics

# Manual verification:
# 1. Load 1000 credentials
# 2. Measure page load time < 3 seconds
# 3. Test import of 1000 credential log
# 4. Measure parse time < 5 seconds
```

**Commit**: NO (unless adding pagination/optimizations)

---

## Dependency Matrix Summary

| Task | Depends On    | Blocks             | Complexity | Category           |
| ---- | ------------- | ------------------ | ---------- | ------------------ |
| 1.1  | None          | 1.2, 1.3, 2.x, 3.x | Low        | quick              |
| 1.2  | 1.1           | 1.3                | Low        | quick              |
| 1.3  | 1.1, 1.2      | 2.x, 3.x, 4.x      | Medium     | quick              |
| 2.1  | 1.x           | 2.2, 2.3           | Low        | quick              |
| 2.2  | 2.1           | 2.3                | Low        | quick              |
| 2.3  | 2.1, 2.2      | 4.2                | Medium     | visual-engineering |
| 3.1  | 1.x           | 3.2, 3.3, 3.4      | Medium     | ultrabrain         |
| 3.2  | 3.1           | 3.4                | Low        | quick              |
| 3.3  | 3.1           | 3.4                | Low        | quick              |
| 3.4  | 3.1, 3.2, 3.3 | 4.3, 5.3           | Low        | quick              |
| 4.1  | 1.x, 2.x, 3.x | 4.2, 4.3, 5.1      | High       | visual-engineering |
| 4.2  | 4.1, 2.3      | 5.1                | Medium     | visual-engineering |
| 4.3  | 3.4, 2.2      | 5.3                | High       | visual-engineering |
| 5.1  | 4.2           | None               | Medium     | visual-engineering |
| 5.2  | 1.2, 1.3      | None               | High       | ultrabrain         |
| 5.3  | 3.4, 4.3      | None               | High       | ultrabrain         |
| 6.1  | None          | 6.2                | Low        | writing            |
| 6.2  | All 1-5, 6.1  | None               | High       | ultrabrain         |
| 6.3  | All 1-5       | None               | Medium     | ultrabrain         |

---

## Commit Strategy

| Phase | Commit Message                                                      | Files                                       | Pre-commit Verification |
| ----- | ------------------------------------------------------------------- | ------------------------------------------- | ----------------------- |
| 1.1   | `feat(types): add VM and enhanced credential types for CDC`         | src/types/teamVault.ts                      | `bun tsc --noEmit`      |
| 1.2   | `feat(storage): add shared credentials storage and utilities`       | src/utils/sharedStorage.ts                  | File creation test      |
| 1.3   | `feat(storage): add VM tracking and credential type utilities`      | src/utils/teamStorage.ts                    | Unit tests pass         |
| 2.1   | `feat(vm): add VM data model and storage utilities`                 | src/types/vm.ts, src/utils/vmStorage.ts     | `bun tsc --noEmit`      |
| 2.2   | `feat(api): add VM management endpoints`                            | src/app/api/vms/\*\*                        | curl API tests          |
| 2.3   | `feat(ui): add VmManager component for VM CRUD`                     | src/app/components/VmManager.tsx            | Browser visual check    |
| 3.1   | `feat(parser): create pluggable parser registry architecture`       | src/utils/parsers/\*\*                      | Registry unit test      |
| 3.2   | `feat(parser): add NTLM pwdump parser with username extraction`     | src/utils/parsers/NtlmPwdumpParser.ts       | Parser unit test        |
| 3.3   | `feat(parser): add NetNTLMv2 parser for network auth hashes`        | src/utils/parsers/NtlmNetNtlmv2Parser.ts    | Parser unit test        |
| 3.4   | `feat(api): add parser registry endpoints`                          | src/app/api/parsers/\*\*                    | curl API tests          |
| 4.1   | `feat(ui): redesign main layout - Team Vault as primary view`       | src/app/page.tsx                            | Browser visual check    |
| 4.2   | `feat(ui): enhance credential table with VM and type badges`        | src/app/components/TeamVaultPanel.tsx       | Browser visual check    |
| 4.3   | `feat(ui): create EnhancedImportModal with parser and VM selection` | src/app/components/EnhancedImportModal.tsx  | Browser workflow test   |
| 5.1   | `feat(ui): add crack action button to individual credentials`       | src/app/components/CrackCredentialModal.tsx | Browser workflow test   |
| 5.2   | `feat(integration): implement shared credentials auto-propagation`  | src/utils/sharedStorage.ts                  | Integration test        |
| 5.3   | `feat(integration): wire up parser registry with import workflow`   | src/app/api/teams/[teamId]/import/route.ts  | E2E import test         |
| 6.1   | `test(data): add CDC sample logs for testing`                       | tests/data/\*\*                             | Parser test with sample |

---

## Success Criteria

### Functional Verification

- [ ] Team Vault displays without tab navigation
- [ ] Shared credentials appear in all team vaults
- [ ] VM badges show on credentials with correct colors
- [ ] Credential type badges distinguish Shared vs TSI
- [ ] Pwdump parser extracts usernames and filters machine accounts
- [ ] NetNTLMv2 parser extracts network auth hashes
- [ ] Enhanced import modal supports parser and VM selection
- [ ] Crack action available on each credential
- [ ] All existing functionality preserved

### API Verification

```bash
# Test all new APIs
curl -s http://localhost:3000/api/vms | jq '.vms' # Returns array
curl -s http://localhost:3000/api/parsers | jq '.parsers' # Returns array
curl -s -X POST http://localhost:3000/api/parsers/parse -H "Content-Type: application/json" \
  -d '{"parserId":"ntlm-pwdump","text":"test"}' | jq '.credentials' # Returns array
```

### UI Verification

```
# Visual checks via browser:
1. No tab navigation visible
2. Team Vault always displayed
3. VM badges on credentials
4. Shared/TSI type indicators
5. Crack button on credential rows
6. Enhanced import with parser selection
```

### Performance Criteria

- [ ] Page load < 3 seconds with 1000 credentials
- [ ] Import 1000 credentials < 5 seconds
- [ ] Parser handles 10MB log file < 10 seconds
- [ ] Shared credential sync < 2 seconds for 20 teams

---

## Risk Mitigation

### Risks Identified

1. **Breaking Existing Functionality**

   - Mitigation: Comprehensive testing after each phase
   - Fallback: Keep old components as backups during transition

2. **Parser Complexity**

   - Mitigation: Start with simple regex, iterate
   - Fallback: Use existing extract-hashes as fallback

3. **Performance with Large Data**

   - Mitigation: Performance testing in Phase 6
   - Fallback: Add pagination if needed

4. **UI Complexity**
   - Mitigation: Incremental UI changes (Task 4.1 → 4.2 → 4.3)
   - Fallback: Feature flags to disable new UI elements

### Rollback Plan

If critical issues arise:

1. Revert to last known good commit
2. Restore `data/teams/` from backup
3. Re-enable tab navigation as temporary measure

---

## Plan Summary

This work plan transforms the Hash-Cracker application into a CDC-focused credential management system through 6 phases:

**Phase 1** lays the foundation with new data models and shared storage.
**Phase 2** adds VM tracking and management.
**Phase 3** implements extensible hash parsing for NTLM logs.
**Phase 4** transforms the UI into a unified Team Vault view.
**Phase 5** integrates all components and makes cracking a secondary action.
**Phase 6** validates everything with comprehensive testing.

**Total Tasks:** 19
**Estimated Duration:** 2-3 weeks (parallel execution)
**Critical Path:** Phase 1 → Phase 4 → Phase 5
**Parallel Opportunities:** Phase 2 and Phase 3 can run concurrently after Phase 1

**Next Step:** Run `/start-work` to begin execution with the orchestrator.
