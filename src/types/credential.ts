export interface Credential {
  /** Stable unique identifier. Never shown in the grid UI. */
  id: string;
  /** The username associated with this credential. */
  username: string;
  /** The plaintext password. */
  password: string;
  /** The hash that was cracked to obtain the password. */
  hash: string;
  /** The team this credential belongs to. */
  team: string;
  /** Comma-separated list of device / VM names this credential applies to. */
  device: string;
  /** True if this credential is shared across all teams. */
  shared: boolean;
}
