import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor() {
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex || !/^[a-f\d]{64}$/i.test(keyHex)) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY must be set as 32-byte hex string (64 chars)',
      );
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt sensitive data (tokens, secrets)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv.encrypted.authTag (hex encoded)
    const combined = `${iv.toString('hex')}.${encrypted}.${authTag.toString('hex')}`;
    return combined;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }
      if (!parts.every((part) => /^(?:[a-f\d]{2})*$/i.test(part))) {
        throw new Error('Invalid ciphertext encoding');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== this.tagLength) {
        throw new Error('Invalid auth tag length');
      }

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new BadRequestException('Failed to decrypt token. It may be corrupted.');
    }
  }

  /**
   * Generate a cryptographically secure random string
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a string (for non-sensitive comparisons)
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
