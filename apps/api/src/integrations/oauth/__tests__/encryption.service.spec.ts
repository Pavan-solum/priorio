import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const originalMasterKey = process.env.ENCRYPTION_MASTER_KEY;

  beforeAll(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64); // 32 bytes hex
  });

  afterAll(() => {
    if (originalMasterKey === undefined) {
      delete process.env.ENCRYPTION_MASTER_KEY;
    } else {
      process.env.ENCRYPTION_MASTER_KEY = originalMasterKey;
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'test-token-123';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).toContain('.');
      expect(encrypted.split('.').length).toBe(3); // iv.encrypted.authTag
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'test-token-123';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different due to random IV
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split('.').length).toBe(3);
    });

    it('should handle long strings', () => {
      const plaintext = 'x'.repeat(1000);
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(service.decrypt(encrypted)).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plaintext = 'test-token-123';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with invalid format', () => {
      const invalidCiphertext = 'invalid.format';

      expect(() => service.decrypt(invalidCiphertext)).toThrow();
    });

    it('should fail with corrupted data', () => {
      const plaintext = 'test-token-123';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split('.');
      parts[1] = parts[1].substring(0, parts[1].length - 2) + 'XX'; // Corrupt encrypted part
      const corrupted = parts.join('.');

      expect(() => service.decrypt(corrupted)).toThrow();
    });

    it('should handle large encrypted data', () => {
      const plaintext = 'x'.repeat(5000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateRandomString', () => {
    it('should generate random strings of specified length', () => {
      const length = 32;
      const random1 = service.generateRandomString(length);
      const random2 = service.generateRandomString(length);

      expect(random1).toHaveLength(length * 2);
      expect(random2).toHaveLength(length * 2);
      expect(random1).not.toBe(random2); // Should be different
    });

    it('should generate hex strings', () => {
      const random = service.generateRandomString(32);

      expect(/^[a-f0-9]+$/.test(random)).toBe(true); // Should be valid hex
    });

    it('should default to 32 bytes', () => {
      const random = service.generateRandomString();

      expect(random).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });

  describe('hash', () => {
    it('should hash a string consistently', () => {
      const value = 'test-value';
      const hash1 = service.hash(value);
      const hash2 = service.hash(value);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hash('value1');
      const hash2 = service.hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character SHA256 hashes', () => {
      const hash = service.hash('test');

      expect(hash).toHaveLength(64); // SHA256 = 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('encryption security', () => {
    it('should use AES-256-GCM algorithm', () => {
      const plaintext = 'sensitive-token';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split('.');

      expect(parts.length).toBe(3); // IV.Encrypted.AuthTag format
      expect(parts[0]).toHaveLength(32); // IV = 16 bytes = 32 hex chars
      expect(parts[2]).toHaveLength(32); // AuthTag = 16 bytes = 32 hex chars
    });

    it('should prevent tampering detection via auth tag', () => {
      const plaintext = 'test-token';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split('.');

      // Tamper with auth tag
      const replacement = parts[2].endsWith('aa') ? 'bb' : 'aa';
      const tamperedAuthTag = parts[2].substring(0, 30) + replacement;
      const tamperedCiphertext = `${parts[0]}.${parts[1]}.${tamperedAuthTag}`;

      expect(() => service.decrypt(tamperedCiphertext)).toThrow();
    });

    it('should be resistant to IV reuse attacks', () => {
      const plaintext = 'test-token';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Even though plaintexts are same, ciphertexts should differ (different IVs)
      expect(encrypted1.split('.')[0]).not.toBe(encrypted2.split('.')[0]); // Different IVs
    });
  });

  describe('edge cases', () => {
    it('rejects non-hexadecimal master keys', () => {
      process.env.ENCRYPTION_MASTER_KEY = 'z'.repeat(64);
      try {
        expect(() => new EncryptionService()).toThrow('ENCRYPTION_MASTER_KEY');
      } finally {
        process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64);
      }
    });

    it('rejects trailing non-hexadecimal ciphertext data', () => {
      const parts = service.encrypt('test-token').split('.');
      parts[1] += 'zz';
      expect(() => service.decrypt(parts.join('.'))).toThrow();
    });

    it('should handle unicode characters', () => {
      const plaintext = '🔐 Test äöü 中文 العربية';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle newlines and special characters', () => {
      const plaintext = 'line1\nline2\r\nline3\ttab\0null';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle max string length', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
