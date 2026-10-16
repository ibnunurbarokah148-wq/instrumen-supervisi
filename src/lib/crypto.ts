import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "sensei-ai-32byte-aes-secret-key!";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptSecret(cipherText: string): string {
  if (!cipherText) return "";
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 2) return cipherText;
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export function maskSecret(plainText: string): string {
  if (!plainText) return "";
  if (plainText.length <= 8) return "••••••••";
  return `${plainText.slice(0, 4)}••••••••${plainText.slice(-4)}`;
}
