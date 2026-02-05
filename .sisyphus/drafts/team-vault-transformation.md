# Draft: Team Vault Transformation

## Original Request

Transform Team Vault into the primary interface of a CDC-focused hash-cracker application.

## User Answers (Confirmed)

### 1. UI Restructuring

- Vault IS the application interface
- Hash cracking is just an action button on credentials
- Remove tab navigation entirely

### 2. VM Tracking

- Custom hybrid approach
- VMs can be defined for each team (team-specific)
- OR added to only one team for edge cases
- VM definitions can be global (available to all teams) OR team-specific

### 3. Shared vs TSI Data Structure

- Shared credentials: stored globally (single source of truth)
- TSI credentials: stored per-team
- Prevents duplication and complexity

### 4. Log File Size

- Small, very small (pasted output from mimikatz/impacket)
- Read all at once - simple implementation, fast parsing
- No streaming or background processing needed

### 5. Hash Type Extensibility

- Build parser registry for easy addition
- Design for any future hash type
- Don't hardcode specific hash types

## Current Context (from user)

- Next.js 15.2.3, TypeScript 5.3.3, file-based storage
- Existing Team Vault feature in `src/types/teamVault.ts`, `src/utils/teamStorage.ts`
- Hash extraction via `src/app/api/extract-hashes/route.ts`
- Team Vault currently secondary feature (tab-based)
- Existing data structure: TeamVault { teamId, teamName, credentials[] }
- Current TeamCredential { id, hash, hashTypeId, hashTypeName, label, password, crackedAt, createdAt }

## Requirements (from user)

1. Transform Team Vault into PRIMARY interface (remove tabs)
2. Implement shared vs TSI tracking (global shared, per-team TSI)
3. Add VM tracking (global + team-specific VMs)
4. Advanced log parsing with username extraction from context
5. Extensible hash parser registry (start with NTLM)
6. Hash cracking triggered FROM Team Vault UI
7. All existing functionality preserved
8. Small log file pasting (mimikatz/impacket output)

## Success Criteria

- User opens app → sees Team Vault as main interface
- Can paste small log files → extracts hashes + usernames + context
- Clear separation of shared vs TSI credentials
- Can mark which VMs each credential works on
- Can crack hashes directly from Team Vault
- Can search/filter by username, hash, password, VM, type
- System extensible for future hash types

## Research Findings

### 1. Test Infrastructure (FOUND)

- **E2E Tests**: Playwright configured with 5 test files in `tests/e2e/`
  - `benchmark.spec.ts`, `hashing.spec.ts`, `potfile.spec.ts`, `yoink.spec.ts`, `navigation.spec.ts`
- **No unit/integration tests**: No vitest/jest configured
- **Test script**: `npm run test` → `playwright test`
- **Test command available for TDD**: YES (Playwright E2E)

### 2. Current Architecture (Analyzed)

- **Tab Navigation**: State-based in `src/app/page.tsx`
  - Two tabs: 'cracker' (blue) and 'vault' (purple)
  - Simple `useState<TabType>('cracker')` pattern
- **Team Vault UI**: `src/app/components/TeamVaultPanel.tsx` (471 lines)
  - Two-column layout: team list (left) + credentials table (right)
  - Local React state with useState hooks
  - Pagination with ShowMoreButton (25 items default)
- **State Management**: Hybrid (React hooks + Server-Sent Events)
  - useConnection.ts for real-time updates
  - LocalStorage for live viewing preference

### 3. Hash Extraction Implementation (Analyzed)

- **API Endpoint**: `src/app/api/extract-hashes/route.ts`
  - Uses regex from config.hashTypes[hashType].regex
  - Global regex execution per line
  - Deduplicates with Set
  - Currently does NOT extract usernames/context
- **Import Flow**: `src/app/api/teams/[teamId]/import/route.ts`
  - Calls extract-hashes logic
  - Adds credentials with TeamCredential structure
  - Sets `label` field to null (extensible for username!)
- **Hash Types**: HARDCODED in `src/config/hashTypes.ts` (887 lines)
  - 200+ hash types defined
  - NOT extensible - requires code modification
  - Regex patterns included

### 4. Data Structures (Analyzed)

- **TeamCredential**: Has `label` field (username) currently null
- **TeamVault**: Per-team file storage (data/teams/{teamId}.json)
- **NO shared credential pool** currently
- **NO VM tracking** currently - only single-machine systemInfo
- **NO TSI credential separation** - all credentials equal
- **Sync**: Cracked hashes synced across ALL teams (case-insensitive)

### 5. API Routes (Analyzed)

- **Teams**: GET/POST /api/teams, GET/DELETE /api/teams/[teamId]
- **Import**: POST /api/teams/[teamId]/import
- **Sync**: POST /api/teams/sync
- **Hash Extraction**: POST /api/extract-hashes
- **Cracking**: POST/DELETE /api/crack

### 6. Existing Patterns to Follow

- File-based JSON storage for teams
- Consistent API response format: { success: true, data: {...} }
- Error responses: { error: "message" }
- Event-based real-time updates (Server-Sent Events)
- Logging via logger.ts (file-based async logging)

## Key Design Decisions (to be applied)

1. **Test Strategy**: Use Playwright E2E for verification (existing infrastructure)
2. **UI Approach**: Change default tab to 'vault' (simple change to useState)
3. **Parser Registry**: Create extensible system replacing hardcoded hashTypes.ts
4. **Shared vs TSI**: Add CredentialScope enum (shared/tsi/team-specific)
5. **VM Tracking**: New interface(s) with global + team-specific VM definitions
6. **Username Extraction**: Extend import flow to parse context from input
