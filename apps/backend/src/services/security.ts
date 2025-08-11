import crypto from 'crypto';
import { createError } from '../middleware/errorHandler';

export class SecurityService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  /**
   * Generate HMAC-SHA256 signature for Shopify webhook verification
   */
  signPayload(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64');
  }

  /**
   * Verify Shopify webhook signature
   */
  verifyShopifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  }

  /**
   * Encrypt sensitive data (like Shopify access tokens)
   */
  encrypt(data: string, encryptionKey: string): string {
    try {
      const key = crypto.scryptSync(encryptionKey, 'salt', this.keyLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('adlign'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + encrypted data + auth tag
      return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
    } catch (error) {
      throw createError('Encryption failed', 500);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, encryptionKey: string): string {
    try {
      const key = crypto.scryptSync(encryptionKey, 'salt', this.keyLength);
      
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const [ivHex, encrypted, tagHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAAD(Buffer.from('adlign'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw createError('Decryption failed', 500);
    }
  }

  /**
   * Generate secure random string
   */
  generateNonce(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, generatedSalt, 10000, 64, 'sha512').toString('hex');
    
    return { hash, salt: generatedSalt };
  }

  /**
   * Verify hash
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }
}

export const securityService = new SecurityService();
