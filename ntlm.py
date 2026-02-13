# Pure Python NTLM hash generator (no OpenSSL required) for testing

import sys
import struct

# Minimal MD4 implementation
class MD4:
    def __init__(self, message=b""):
        self.remainder = message
        self.count = 0
        self.h = [
            0x67452301,
            0xefcdab89,
            0x98badcfe,
            0x10325476,
        ]

    def _left_rotate(self, x, n):
        x &= 0xFFFFFFFF
        return ((x << n) | (x >> (32 - n))) & 0xFFFFFFFF

    def _process(self, chunk):
        X = list(struct.unpack("<16I", chunk))
        a, b, c, d = self.h

        def F(x, y, z): return (x & y) | (~x & z)
        def G(x, y, z): return (x & y) | (x & z) | (y & z)
        def H(x, y, z): return x ^ y ^ z

        # Round 1
        s = [3, 7, 11, 19]
        for i in range(16):
            k = i
            a = self._left_rotate((a + F(b, c, d) + X[k]) & 0xFFFFFFFF, s[i % 4])
            a, b, c, d = d, a, b, c

        # Round 2
        s = [3, 5, 9, 13]
        for i in range(16):
            k = (i % 4) * 4 + i // 4
            a = self._left_rotate((a + G(b, c, d) + X[k] + 0x5A827999) & 0xFFFFFFFF, s[i % 4])
            a, b, c, d = d, a, b, c

        # Round 3
        s = [3, 9, 11, 15]
        order = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
        for i in range(16):
            k = order[i]
            a = self._left_rotate((a + H(b, c, d) + X[k] + 0x6ED9EBA1) & 0xFFFFFFFF, s[i % 4])
            a, b, c, d = d, a, b, c

        self.h[0] = (self.h[0] + a) & 0xFFFFFFFF
        self.h[1] = (self.h[1] + b) & 0xFFFFFFFF
        self.h[2] = (self.h[2] + c) & 0xFFFFFFFF
        self.h[3] = (self.h[3] + d) & 0xFFFFFFFF

    def update(self, message):
        message = self.remainder + message
        length = len(message)
        for i in range(0, length // 64 * 64, 64):
            self._process(message[i:i+64])
        self.remainder = message[length // 64 * 64:]
        self.count += length

    def digest(self):
        message = self.remainder
        length = (self.count << 3) & 0xFFFFFFFFFFFFFFFF
        message += b'\x80'
        while (len(message) % 64) != 56:
            message += b'\x00'
        message += struct.pack("<Q", length)

        for i in range(0, len(message), 64):
            self._process(message[i:i+64])

        return struct.pack("<4I", *self.h)

def ntlm_hash(password):
    md4 = MD4(password.encode('utf-16le'))
    md4.update(b"")
    return md4.digest().hex()

# One hash per input line
for line in sys.stdin:
    pw = line.rstrip("\n")
    print(ntlm_hash(pw))
