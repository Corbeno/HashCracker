export interface HashTypeOption {
  id: number;
  name: string;
  description: string;
}

export interface CrackedHashData {
  password: string;
  isCaseSensitive: boolean;
}

export interface DisplayHash {
  hash: string;
  password?: string;
  isCaseSensitive: boolean;
}

export interface ExtractionResult {
  hashType?: string;
  count?: number;
  error?: string;
}
