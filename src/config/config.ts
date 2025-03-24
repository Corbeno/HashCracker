import hashTypes from './hashTypes';

export interface HashcatMode {
  name: string; // Display name for the mode
  description: string; // Description of the mode
  wordlist?: string; // Path to wordlist file, relative to wordlistsDir
  rules?: string[]; // Array of rule files to apply, relative to rulesDir
  mask?: string; // Mask file to use, relative to masksDir
  attackMode?: number; // Hashcat attack mode (-a), defaults to 0 for wordlist
}

interface Config {
  hashcat: {
    path: string;
    potfilePath: string; // Path to hashcat potfile
    statusTimer: number; // Status update interval in seconds
    dirs: {
      hashes: string; // Directory for hash files and potfiles
      wordlists: string; // Directory for wordlist files
      rules: string; // Directory for rule files
      masks: string; // Directory for mask files
    };
    hashTypes: typeof hashTypes;
    attackModes: {
      [key: string]: HashcatMode;
    };
  };
  logger: {
    level: string;
    format: string;
  };
}

const config: Config = {
  hashcat: {
    path: process.env.HASHCAT_PATH || '',
    potfilePath: process.env.POTFILE_PATH || '',
    statusTimer: 2, // Update system info every 2 seconds
    dirs: {
      hashes: process.env.HASHES_DIR || '',
      wordlists: process.env.WORDLISTS_DIR || '',
      rules: process.env.RULES_DIR || '',
      masks: process.env.MASKS_DIR || '',
    },
    hashTypes: hashTypes,
    attackModes: {
      tsi: {
        name: 'TSI',
        description: 'All TSI combinations',
        mask: 'tsi.hcmask',
        attackMode: 3,
      },
      rockyou: {
        name: 'RockYou',
        description: 'Just rockyou.txt',
        wordlist: 'rockyou.txt',
        attackMode: 0,
      },
      'one-rule-to-rule-them-still': {
        name: 'rockyou.txt + One Rule To Rule Them Still',
        description: 'One Rule To Rule Them Still',
        rules: ['OneRuleToRuleThemStill.rule'],
        wordlist: 'rockyou.txt',
        attackMode: 0,
      },
      'rockyou-combinator': {
        name: 'RockYou + Combinator',
        description: 'rockyou.txt with generic combinator rules',
        wordlist: 'rockyou.txt',
        rules: ['combinator.rule'],
        attackMode: 0,
      },
      'english-dictionary-combinator-dive': {
        name: 'English Dictionary + Combinator + Dive',
        description: 'Dictionary wordlist with generic combinator rules and dive rules',
        wordlist: 'english.txt',
        rules: ['combinator.rule', 'dive.rule'],
        attackMode: 0,
      },
      'hashmob-medium': {
        name: 'hashmob medium wordlist',
        description: 'Just hashmob medium wordlist',
        wordlist: 'hashmob.net_2025-03-11.medium.found',
        attackMode: 0,
      },
      'hashmob-full': {
        name: 'hashmob full wordlist',
        description: 'Just hashmob full wordlist (20GB)',
        wordlist: 'hashmob.net_2025-03-16.found',
        attackMode: 0,
      },
      'weakpass-4a': {
        name: 'weakpass 4a wordlist',
        description: 'Just weakpass 4a wordlist (80GB)',
        wordlist: 'weakpass_4a.txt',
        attackMode: 0,
      },
      'top-250-rules-rockyou': {
        name: 'Top 250 Rules + rockyou.txt',
        description: 'Top 250 rules from hashmob with rockyou.txt',
        rules: ['top_250.rule'],
        wordlist: 'rockyou.txt',
        attackMode: 0,
      },
      'top-250-rules-hashmob-medium': {
        name: 'Top 250 Rules + hashmob medium wordlist',
        description: 'Top 250 rules from hashmob with hashmob medium wordlist',
        rules: ['top_250.rule'],
        wordlist: 'hashmob.net_2025-03-11.medium.found',
        attackMode: 0,
      },
      'english-dictionary-combinator-leetspeak': {
        name: 'English Dictionary + Combinator + Leetspeak',
        description: 'Dictionary wordlist with generic combinator rules and leetspeak rules',
        wordlist: 'english.txt',
        rules: ['combinator.rule', 'leetspeak.rule'],
        attackMode: 0,
      },
      'rockyou-combinator-dive': {
        name: '(LONG) RockYou + Combinator + Dive',
        description: 'rockyou.txt with generic combinator and dive rules. Lots of combinations',
        wordlist: 'rockyou.txt',
        rules: ['combinator.rule', 'dive.rule'],
        attackMode: 0,
      },
      'all-six-chars': {
        name: 'All Six Chars',
        description: 'All Six Chars',
        mask: 'allSixChars.hcmask',
        attackMode: 3,
      },
      'all-eight-chars': {
        name: 'All Eight Chars (LONG)',
        description: 'All Eight Chars',
        mask: 'allEightChars.hcmask',
        attackMode: 3,
      },
    },
  },
  logger: {
    level: 'debug',
    format: 'combined',
  },
};

export default config;
