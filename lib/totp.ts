import crypto from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20): string {
  const data = crypto.randomBytes(bytes);
  let bits = "";
  for (const byte of data) bits += byte.toString(2).padStart(8, "0");
  let secret = "";
  for (let i = 0; i < bits.length; i += 5) {
    secret += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return secret;
}

function decodeBase32(value: string): Buffer {
  const bits = value
    .replace(/=+$/, "")
    .toUpperCase()
    .split("")
    .map((char) => ALPHABET.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function verifyTotpCode(secret: string, input: string, now = Date.now()): boolean {
  const code = input.replace(/\D/g, "");
  if (code.length !== 6) return false;
  const counter = Math.floor(now / 1000 / 30);
  const key = decodeBase32(secret);
  // Allow one adjacent time window for small clock drift.
  for (const offset of [-1, 0, 1]) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter + offset));
    const digest = crypto.createHmac("sha1", key).update(buffer).digest();
    const index = digest[digest.length - 1] & 0x0f;
    const value = (digest.readUInt32BE(index) & 0x7fffffff) % 1_000_000;
    if (String(value).padStart(6, "0") === code) return true;
  }
  return false;
}

export function totpUri(secret: string, email: string): string {
  const issuer = "Trud Krut";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
