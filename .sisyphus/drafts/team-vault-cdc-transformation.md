# Draft: Transform Team Vault to CDC-Centric Hash Cracker

## User's Goal

Transform Team Vault from a half-finished prototype into CENTER of the hash-cracker application for Cyber Defense Competitions (CDC).

## NEW PARADIGM

- **Primary Focus**: Team passwords/credentials are center of attention
- **Secondary Action**: Hash cracking happens ON credentials (not separate workflow)
- **CDC Workflow**:
  - Shared-credentials: passwords shared across ALL teams
  - TSI (Team-Specific Info): passwords unique to each team
  - Track which credentials work on which VMs
- **Log Parsing**: Parse large log files with username+hash extraction ("yoink")
- **Extensibility**: Start with NTLM, architecture must support future hash types

## Current Architecture (from context)

- **Tech Stack**: Next.js 15.2.3, React 18.2.0, TypeScript 5.3.3
- **Storage**: File-based (data/teams/{teamId}.json)
- **Real-time**: SSE and Socket.IO

## Existing Team Vault Features

✅ Working:

- Create/delete teams
- Import hashes with regex extraction
- View credentials in table
- Crack hashes from vault
- Sync cracked hashes from cracked.txt to teams
- Auto-sync on file change

❌ Limitations:

- No CDC-specific concepts (shared vs TSI)
- No VM credential tracking
- Basic username extraction (just labels)
- Hash extraction doesn't preserve context
- Team Vault is secondary feature (tab-based)

## Research Findings

### Current UI Structure

- **Tab-based navigation**: Two tabs ('cracker' | 'vault') - Team Vault is SECONDARY tab
- **Main entry**: `src/app/page.tsx` controls activeTab state
- **Single-page app**: No routes, just tab switching
- **Default tab**: 'cracker' (needs to change to 'vault')
- **Cross-tab**: Vault can trigger cracking via callback that switches to cracker tab

### Team Vault Implementation

- **Two-column layout**: Team list (left) + Credentials (right)
- **Storage**: `data/teams/{teamId}.json` - file-based JSON
- **Data models**: `TeamVault` with `TeamCredential[]`
- **Sync mechanism**: POST `/api/teams/sync` reads `cracked.txt` and updates all teams
- **Import flow**: ImportHashesModal → extract-hashes API → deduplication → add to vault
- **Debounced extraction**: 400ms debounce prevents API spam

### Hash Extraction Infrastructure

- **Regex-based**: Each hash type has regex pattern in `src/config/hashTypes.ts`
- **Extensible**: Add new types by extending `HashType` interface with regex
- **Extraction logic**: Same pattern used in 3 places (extract-hashes, team import, yoink modal)
- **Capturing groups**: Uses `match[match.length - 1]` - last group or full match
- **Deduplication**: Uses Set for unique hashes

### Key Files

- `src/app/page.tsx` - Main tab controller
- `src/app/components/TeamVaultPanel.tsx` - Vault UI
- `src/utils/teamStorage.ts` - CRUD operations
- `src/app/api/teams/*` - Team API endpoints
- `src/config/hashTypes.ts` - Hash type definitions
- `src/app/api/extract-hashes/route.ts` - Extraction API

## NTLM Parsing Best Practices (Research Complete)

### pwdump Format

- **Structure**: `username:rid:LM_hash:NT_hash:comment:homedir:`
- **Username extraction**: Index 0 (split by `:`)
- **Empty LM hash**: `aad3b435b51404eeaad3b435b51404ee` (should skip/filter)
- **Machine accounts**: Filter out usernames ending in `$` (regex: `\$$`)

### NetNTLMv2 Format

- **Structure**: `DOMAIN\user::challenge:NTproof:LMproof`
- **Username extraction**: Before `::` (split by `::`)
- **Case handling**: Uppercase username (domain-sensitive), lowercase hashes
- **Duplicate detection**: Track `username:computer` combinations

### Best Practices from Production Systems

1. **DoS Protection**: Limit line length to 50,000 chars
2. **Memory Efficiency**: Process line-by-line (streaming), not entire file
3. **Format Detection**: Try multiple patterns in order: pwdump → NetNTLMv2 → NTDS
4. **Validation**: 32 hex chars for NTLM, variable for NetNTLMv2
5. **Context Preservation**: Return line numbers, original line, error details

### Regex Patterns

```typescript
// pwdump
const PWDUMP_PATTERN =
  /^(?P<user>[^:]+):(?P<rid>\d+):(?P<lm>[0-9a-fA-F]{32}|\*):(?P<nt>[0-9a-fA-F]{32}|\*):.*$/i;

// NetNTLMv2
const NETNTLMV2_PATTERN =
  /^([^\\/:*?"<>|]{1,20}\\)?[^\\/:*?"<>|]{1,20}[:]{2,3}([^\\/:*?"<>|]{1,20}:)?[^\\/:*?"<>|]{1,20}:[a-f0-9]{32}:[a-f0-9]+$/i;

// Empty LM hash
const EMPTY_LM_HASH = 'aad3b435b51404eeaad3b435b51404ee';
```

## User Decisions (ALL REQUIREMENTS CLARIFIED)

### 1. UI Restructuring: "Vault as Main View"

- **Decision**: Vault IS the app (always visible, no tabs)
- **Implication**: Remove tab navigation, cracking is just an action button on credentials
- **Files to modify**: `src/app/page.tsx` (remove activeTab state), `src/app/components/TeamVaultPanel.tsx` (become main view)

### 2. VM Tracking: "Custom Hybrid Approach"

- **Decision**: VMs can be global (available to all teams) OR team-specific (only one team)
- **Implication**: Need VM management system with scope (global vs team-specific)
- **Files to create**: `src/types/vm.ts`, `src/utils/vmStorage.ts`, `src/app/components/VmManager.tsx`

### 3. Data Structure: "Global Shared"

- **Decision**: Shared credentials stored globally (single source of truth), TSI per-team
- **Implication**: New data structure `data/shared.json` for shared credentials
- **Files to modify**: `src/types/teamVault.ts`, `src/utils/teamStorage.ts`

### 4. Log File Performance: "Small Files"

- **Decision**: Pasted output from apps (mimicats, impacket), read all at once
- **Implication**: No streaming needed, simple regex extraction sufficient
- **Files to create**: `src/utils/hashParserRegistry.ts` (extensible parser architecture)

### 5. Hash Type Extensibility: "Parser Registry"

- **Decision**: Build parser registry for easy addition of new hash types
- **Implication**: Pluggable architecture, not hardcoded NTLM-specific logic
- **Files to create**: `src/utils/hashParserRegistry.ts`, `src/parsers/ntlmParser.ts`

## Test Infrastructure Assessment (COMPLETE)

### Test Infrastructure EXISTS ✓

- **Framework**: Playwright (`@playwright/test` v1.57.0)
- **Test script**: `npm test` (playwright test)
- **Config**: `playwright.config.ts`
- **Test directory**: `./tests/e2e/` with 5 test files, 30+ test cases
- **Test patterns**: E2E tests covering hash cracking, modals, navigation

### Existing Test Patterns

```typescript
// Basic E2E test with setup
test.describe('Hashing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should validate empty input', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Cracking' }).click();
    await expect(page.getByText('Please enter at least one hash')).toBeVisible();
  });
});
```

### Test Strategy Decision

- **E2E Tests**: Playwright for UI workflows (already set up)
- **Verification**: Playwright browser automation for all UI features
- **No unit test framework**: Only Playwright E2E tests exist
- **Approach**: Use Playwright for acceptance criteria verification

## Final Clearance Checklist

□ Core objective clearly defined? **YES** - Transform Team Vault to CDC-centric interface
□ Scope boundaries established (IN/OUT)? **YES** - Vault as main view, cracking as action, CDC-specific workflow
□ No critical ambiguities remaining? **YES** - All questions answered
□ Technical approach decided? **YES** - Parser registry, global shared, hybrid VM tracking
□ Test strategy confirmed (E2E/Playwright)? **YES** - Playwright E2E tests for UI verification
□ No blocking questions outstanding? **YES** - All clarifications received

**ALL REQUIREMENTS CLEAR. PROCEEDING TO PLAN GENERATION.**
