import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CrackedHashData,
  DisplayHash,
  ExtractionResult,
  HashTypeOption,
} from '../_components/yoink/types';

import { compareHashes } from '@/utils/clientHashUtils';

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
  const [displayHashes, setDisplayHashes] = useState<DisplayHash[]>([]);

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

      if (selectedHashType === null && lastSelectedHashType === null && options.length > 0) {
        setSelectedHashType(options[0].id as number);
      } else if (selectedHashType === null && lastSelectedHashType !== null) {
        setSelectedHashType(lastSelectedHashType);
      }
    } catch (error) {
      console.error('Error fetching hash types with regex:', error);
    } finally {
      setIsLoadingHashTypes(false);
    }
  }, [selectedHashType, setSelectedHashType]);

  const fetchCrackedHashes = useCallback(async () => {
    try {
      const response = await fetch('/api/cracked-hashes');
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
    void fetchCrackedHashes();
  }, [fetchCrackedHashes, fetchHashTypesWithRegex, isOpen]);

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

  useEffect(() => {
    if (!outputText) {
      setDisplayHashes([]);
      return;
    }

    const hashes = outputText.split('\n').filter(hash => hash.trim() !== '');
    const nextDisplayHashes: DisplayHash[] = hashes.map(hash => {
      let password: string | undefined;
      let isCaseSensitive = false;

      if (crackedHashes[hash]) {
        password = crackedHashes[hash].password;
        isCaseSensitive = crackedHashes[hash].isCaseSensitive;
      } else {
        const matchedEntry = Object.entries(crackedHashes).find(([crackedHash, data]) => {
          return compareHashes(crackedHash, hash, data.isCaseSensitive);
        });

        if (matchedEntry) {
          const data = matchedEntry[1];
          password = data.password;
          isCaseSensitive = data.isCaseSensitive;
        }
      }

      return {
        hash,
        password,
        isCaseSensitive,
      };
    });

    setDisplayHashes(nextDisplayHashes);
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
