import { argon2id } from '@noble/hashes/argon2';
import { randomBytes } from '@noble/hashes/utils';

// Crypto configuration constants
export const CRYPTO_CONFIG = {
  ARGON2_TIME: 3,
  ARGON2_MEMORY: 64 * 1024, // 64MB
  ARGON2_PARALLELISM: 1,
  ARGON2_HASH_LENGTH: 32,
  AES_KEY_LENGTH: 256,
  IV_LENGTH: 12,
  SALT_LENGTH: 32,
} as const;

// Types for encrypted data
export interface EncryptedData {
  iv: string; // base64 encoded
  ciphertext: string; // base64 encoded
  tag: string; // base64 encoded
}

export interface VaultEntry {
  id?: string;
  title: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  category?: string;
  favorite?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EncryptedVaultEntry {
  id?: string;
  userId: string;
  title: string; // Only title is stored unencrypted for display
  encryptedData: EncryptedData;
  createdAt?: string;
  updatedAt?: string;
}

// Utility functions
export function generateRandomBytes(length: number): Uint8Array {
  return randomBytes(length);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random salt for each user
export function generateSalt(): Uint8Array {
  return generateRandomBytes(CRYPTO_CONFIG.SALT_LENGTH);
}

// Derive encryption key from master password using Argon2id
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  try {
    const hashResult = argon2id(password, salt, {
      t: CRYPTO_CONFIG.ARGON2_TIME,
      m: CRYPTO_CONFIG.ARGON2_MEMORY,
      p: CRYPTO_CONFIG.ARGON2_PARALLELISM,
      dkLen: CRYPTO_CONFIG.ARGON2_HASH_LENGTH,
    });

    // Import the derived key for AES-GCM
    return await crypto.subtle.importKey(
      'raw',
      hashResult,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Key derivation failed:', error);
    throw new Error('Failed to derive encryption key');
  }
}

// Hash master password for server storage using Argon2id
export async function hashPasswordForStorage(
  password: string,
  salt: Uint8Array
): Promise<string> {
  try {
    const hashResult = argon2id(password, salt, {
      t: CRYPTO_CONFIG.ARGON2_TIME,
      m: CRYPTO_CONFIG.ARGON2_MEMORY,
      p: CRYPTO_CONFIG.ARGON2_PARALLELISM,
      dkLen: CRYPTO_CONFIG.ARGON2_HASH_LENGTH,
    });

    return arrayBufferToBase64(hashResult);
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

// Verify password against stored hash
export async function verifyPassword(
  password: string,
  salt: Uint8Array,
  storedHash: string
): Promise<boolean> {
  try {
    const computedHash = await hashPasswordForStorage(password, salt);
    return computedHash === storedHash;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

// Encrypt data using AES-256-GCM
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<EncryptedData> {
  try {
    const iv = generateRandomBytes(CRYPTO_CONFIG.IV_LENGTH);
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    // Split the result into ciphertext and authentication tag
    const ciphertext = encrypted.slice(0, -16);
    const tag = encrypted.slice(-16);

    return {
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext),
      tag: arrayBufferToBase64(tag),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data using AES-256-GCM
export async function decryptData(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  try {
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const tag = base64ToArrayBuffer(encryptedData.tag);

    // Combine ciphertext and tag
    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(tag), ciphertext.byteLength);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      combined
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Encrypt a vault entry
export async function encryptVaultEntry(
  entry: VaultEntry,
  key: CryptoKey
): Promise<EncryptedData> {
  const dataToEncrypt = JSON.stringify({
    url: entry.url || '',
    username: entry.username || '',
    password: entry.password || '',
    notes: entry.notes || '',
  });

  return await encryptData(dataToEncrypt, key);
}

// Decrypt a vault entry
export async function decryptVaultEntry(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<Partial<VaultEntry>> {
  const decryptedData = await decryptData(encryptedData, key);
  return JSON.parse(decryptedData);
}

// Password strength calculation
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) score += 1;
  else feedback.push('Use at least 12 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  return { score, feedback };
}

// Generate a secure password
export function generatePassword(options: {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSpecialChars: boolean;
}): string {
  let charset = '';
  
  if (options.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (options.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.includeNumbers) charset += '0123456789';
  if (options.includeSpecialChars) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!charset) {
    throw new Error('At least one character type must be selected');
  }

  const randomBytes = generateRandomBytes(options.length);
  let password = '';

  for (let i = 0; i < options.length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

// CryptoService class that wraps all crypto functions
class CryptoService {
  deriveKeyFromPassword = deriveKeyFromPassword;
  encryptData = encryptData;
  decryptData = decryptData;
  encryptVaultEntry = encryptVaultEntry;
  decryptVaultEntry = decryptVaultEntry;
  calculatePasswordStrength = calculatePasswordStrength;
  generatePassword = generatePassword;
}

export const cryptoService = new CryptoService();
