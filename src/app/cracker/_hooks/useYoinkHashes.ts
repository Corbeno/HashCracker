import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CrackedHashData,
  DisplayHash,
  ExtractionResult,
  HashTypeOption,
} from '../_components/yoink/types';

let lastSelectedHashType: number | null = null;

interface UseYoinkHashesResult {
  inputText: string;
  outputText: string;
  isLoading: boolean;
  hashTypeOptions: HashTypeOption[];
  selectedHashType: number | null;
  isLoadingHashTypes: boolean;
  extractionResult: ExtractionResult;
  displayHashes: DisplayHash[];
  setInputText: (value: string) => void;
  setSelectedHashType: (value: number) => void;
  clearInput: () => void;
}

export default function useYoinkHashes(isOpen: boolean): UseYoinkHashesResult {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hashTypeOptions, setHashTypeOptions] = useState<HashTypeOption[]>([]);
  const [selectedHashType, setSelectedHashTypeState] = useState<number | null>(
    lastSelectedHashType
  );
  const [isLoadingHashTypes, setIsLoadingHashTypes] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult>({});
  const [crackedHashes, setCrackedHashes] = useState<Record<string, CrackedHashData>>({});

  const setSelectedHashType = useCallback((value: number) => {
    setSelectedHashTypeState(value);
    lastSelectedHashType = value;
  }, []);

  const fetchHashTypesWithRegex = useCallback(async () => {
    setIsLoadingHashTypes(true);
    try {
      const response = await fetch('/api/hash-types-with-regex');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const options = data.hashTypes.map((hashType: any) => ({
        id: hashType.id,
        name: `${hashType.id} - ${hashType.name}`,
        description: hashType.regex
          ? `${hashType.category || 'Other'} - Regex: ${hashType.regex}`
          : hashType.category || 'Other',
      }));

      setHashTypeOptions(options);
      setSelectedHashTypeState(current => {
        if (current !== null) return current;
        const next = lastSelectedHashType ?? (options[0]?.id as number | undefined) ?? null;
        lastSelectedHashType = next;
        return next;
      });
    } catch (error) {
      console.error('Error fetching hash types with regex:', error);
    } finally {
      setIsLoadingHashTypes(false);
    }
  }, []);

  const fetchCrackedHashes = useCallback(async (hashType: number | null) => {
    if (hashType === null) {
      setCrackedHashes({});
      return;
    }
    try {
      const response = await fetch(`/api/cracked-hashes?hashType=${hashType}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setCrackedHashes(data.crackedHashes || {});
    } catch (error) {
      console.error('Error fetching cracked hashes:', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void fetchHashTypesWithRegex();
  }, [fetchHashTypesWithRegex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchCrackedHashes(selectedHashType);
  }, [fetchCrackedHashes, isOpen, selectedHashType]);

  const debouncedFetchHashes = useMemo(
    () =>
      debounce(async (text: string, hashType: number | null) => {
        if (!text.trim() || hashType === null) {
          setOutputText('');
          setExtractionResult({});
          return;
        }

        setIsLoading(true);
        try {
          const response = await fetch('/api/extract-hashes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, hashType }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Error: ${response.status}`);
          }

          setOutputText(data.hashes.join('\n'));
          setExtractionResult({
            hashType: data.hashType,
            count: data.count,
          });
        } catch (error) {
          console.error('Error extracting hashes:', error);
          setOutputText('');
          setExtractionResult({
            error:
              error instanceof Error ? error.message : 'Error extracting hashes. Please try again.',
          });
        } finally {
          setIsLoading(false);
        }
      }, 500),
    []
  );

  useEffect(() => {
    if (selectedHashType !== null) {
      void debouncedFetchHashes(inputText, selectedHashType);
    }

    return () => {
      debouncedFetchHashes.cancel();
    };
  }, [debouncedFetchHashes, inputText, selectedHashType]);

  const displayHashes = useMemo<DisplayHash[]>(() => {
    if (!outputText) return [];

    const entries = Object.entries(crackedHashes);
    const isCaseSensitive = entries[0]?.[1].isCaseSensitive ?? false;
    const crackedByHash = new Map(
      entries.map(([hash, data]) => [isCaseSensitive ? hash : hash.toLowerCase(), data.password])
    );

    return outputText
      .split('\n')
      .filter(hash => hash.trim() !== '')
      .map(hash => ({
        hash,
        password: crackedByHash.get(isCaseSensitive ? hash : hash.toLowerCase()),
        isCaseSensitive,
      }));
  }, [crackedHashes, outputText]);

  const clearInput = useCallback(() => {
    setInputText('');
  }, []);

  return {
    inputText,
    outputText,
    isLoading,
    hashTypeOptions,
    selectedHashType,
    isLoadingHashTypes,
    extractionResult,
    displayHashes,
    setInputText,
    setSelectedHashType,
    clearInput,
  };
}
