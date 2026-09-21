import { expect, test } from '@playwright/test';

import { parseNxcSmbLog } from '@/utils/logImport/parsers/nxcSmb';

const lm = 'aad3b435b51404eeaad3b435b51404ee';
const nt = '6aa15b3d14492d3fa4aa7c5e9cdc0e6a';
const emptyNt = '31d6cfe0d16ae931b73c59d7e0c089c0';
const records = [
  `Administrator:500:${lm}:${nt}::: (status=Enabled)`,
  `Guest:501:${lm}:${emptyNt}::: (status=Disabled)`,
  `team25.isucdc.com\\aldo:1123:${lm}:${nt}::: (status=Enabled)`,
  `AD$:1000:${lm}:${nt}::: (status=Enabled)`,
];
const expected = [
  { username: 'Administrator', hash: nt, hashType: 1000 },
  { username: 'Guest', hash: emptyNt, hashType: 1000 },
  { username: 'team25.isucdc.com\\aldo', hash: nt, hashType: 1000 },
  { username: 'AD$', hash: nt, hashType: 1000 },
];

for (const separator of ['\n', '\r\n', ' ']) {
  test(`imports NXC records separated by ${JSON.stringify(separator)}`, () => {
    expect(parseNxcSmbLog(records.join(separator))).toEqual(expected);
  });
}

test('strips NXC SMB prefixes and ANSI colors, ignoring diagnostic lines', () => {
  const prefix = 'SMB  192.0.2.1  445  DC01  ';
  const log = [
    `${prefix}[*] Dumping NTDS secrets`,
    ...records.map(record => `\x1b[32m${prefix}${record}\x1b[0m`),
    `${prefix}[+] Dump complete`,
  ].join('\n');
  expect(parseNxcSmbLog(log)).toEqual(expected);
});

test('accepts unannotated records and normalizes uppercase hashes', () => {
  expect(
    parseNxcSmbLog(`user:1001:${lm}:${nt.toUpperCase()}::: other:1002:${lm}:${nt}:::`)
  ).toEqual([
    { username: 'user', hash: nt, hashType: 1000 },
    { username: 'other', hash: nt, hashType: 1000 },
  ]);
});

test('ignores malformed records instead of importing LM hashes or statuses', () => {
  expect(
    parseNxcSmbLog(
      [
        `user:1001:${lm}:invalid::: (status=Enabled)`,
        `user:rid:${lm}:${nt}:::`,
        'nothing to import',
      ].join('\n')
    )
  ).toEqual([]);
});
