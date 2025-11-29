import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export const encryptToken = (plainText: string, secret: string) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(secret, "utf-8"), iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return `${iv.toString("base64")}.${authTag}.${encrypted}`;
};

export const decryptToken = (payload: string, secret: string) => {
  const [ivB64, authTagB64, encrypted] = payload.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(secret, "utf-8"), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
