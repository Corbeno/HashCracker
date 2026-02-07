# Credential Vault -- Implementation Plan

## What is this?

Once a password is cracked, there is no way to associate it with a username, a team, a device (VM),
or to flag it as a shared credential. The Credential Vault is a manual-entry grid where operators
can record and organize that context after a crack lands.

This is iteration one. It is local-only (localStorage), manual-entry only, and lives in a single
AG Grid instance. Future iterations will add server sync and automatic population from crack results.

---

## Design Decisions

| Decision                | Choice                                                                                        | Rationale                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Grid library            | ag-grid-community + ag-grid-react                                                             | Battle-tested inline editing, built-in grouping/filtering, no license cost                        |
| Theme                   | ag-theme-alpine-dark (out of the box)                                                         | Functional dark theme. Polish can come later                                                      |
| Layout                  | Tabbed. AppHeader stays fixed; tab bar below it switches between Cracker and Credential Vault | Gives the grid the full page width and height. Doesn't bury it below the existing panels          |
| Shared credential flag  | Dedicated boolean checkbox column                                                             | Explicit. Visually scannable. No ambiguity about what "shared" means                              |
| Multi-device (VM) field | Comma-separated text in a single cell                                                         | Dead simple for a PoC. Can be structured into a tag widget or relational table later              |
| Persistence             | localStorage (key: `credentialVault`)                                                         | Local-only constraint. No API round-trip on every edit. Trivial to swap to a server store later   |
| Save behavior           | Auto-save on every cell edit (no save button)                                                 | Standard inline-editing UX. Every `onCellValueChanged` writes the full array back to localStorage |

---

## Data Model

```typescript
interface Credential {
  id: string; // crypto.randomUUID() -- stable identity across edits
  username: string; // optional (empty string = blank)
  password: string; // optional
  hash: string; // optional
  team: string; // optional
  device: string; // comma-separated list of VM names. optional
  shared: boolean; // true = this credential is the same for all teams
}
```

All string fields are optional in the sense that they can be left blank. The `id` is always
populated on row creation and is never exposed in the grid UI.

---

## Columns

| Column   | Type     | Editable | Notes                       |
| -------- | -------- | -------- | --------------------------- |
| Username | text     | yes      |                             |
| Password | text     | yes      |                             |
| Hash     | text     | yes      |                             |
| Team     | text     | yes      |                             |
| Device   | text     | yes      | Comma-separated: "VM1, VM2" |
| Shared   | checkbox | yes      | Boolean toggle              |

---

## What changes and what doesn't

### New files

| File                                          | Purpose                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `src/types/credential.ts`                     | The `Credential` interface                                            |
| `src/hooks/useCredentialVault.ts`             | localStorage read/write hook. Exposes credentials + add/update/delete |
| `src/app/components/TabBar.tsx`               | Generic two-tab bar component                                         |
| `src/app/components/CredentialVaultPanel.tsx` | The AG Grid panel. Column defs, event wiring, add/delete buttons      |

### Modified files

| File                  | What changes                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `package.json`        | Add `ag-grid-community` and `ag-grid-react`                                                        |
| `src/app/globals.css` | Import AG Grid base + alpine-dark theme CSS                                                        |
| `src/app/page.tsx`    | Add `activeTab` state. Render TabBar. Conditionally render Cracker content or CredentialVaultPanel |

### Untouched

- No new API routes
- No server-side changes whatsoever
- No changes to AppHeader, HashInputForm, CrackedHashesPanel, ActiveJobsPanel, or any existing component internals
- No changes to the cracking flow, SSE, job queue, or file watchers

---

## Out of scope (v1)

- Import / export of credential data
- Server sync
- Auto-population from crack results
- Custom styling / theming of the AG Grid beyond alpine-dark defaults
- Validation or deduplication of credential rows
