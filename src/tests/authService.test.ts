import { AuthService } from '../services/authService';

describe('AuthService', () => {
  const testPassword = 'testPassword123';
  let hashedPassword: string;

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      hashedPassword = await AuthService.hashPassword(testPassword);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    beforeAll(async () => {
      hashedPassword = await AuthService.hashPassword(testPassword);
    });

    it('should return true for correct password', async () => {
      const result = await AuthService.comparePassword(testPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const result = await AuthService.comparePassword('wrongPassword', hashedPassword);
      expect(result).toBe(false);
    });
  });

  describe('JWT Token Management', () => {
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
    };

    describe('generateAccessToken', () => {
      it('should generate a valid access token', () => {
        const token = AuthService.generateAccessToken(testPayload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a valid refresh token', () => {
        const token = AuthService.generateRefreshToken(testPayload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify a valid access token', () => {
        const token = AuthService.generateAccessToken(testPayload);
        const decoded = AuthService.verifyAccessToken(token);
        expect(decoded.userId).toBe(testPayload.userId);
        expect(decoded.email).toBe(testPayload.email);
      });

      it('should throw error for invalid token', () => {
        expect(() => AuthService.verifyAccessToken('invalid-token')).toThrow();
      });
    });

    describe('verifyRefreshToken', () => {
      it('should verify a valid refresh token', () => {
        const token = AuthService.generateRefreshToken(testPayload);
        const decoded = AuthService.verifyRefreshToken(token);
        expect(decoded.userId).toBe(testPayload.userId);
        expect(decoded.email).toBe(testPayload.email);
      });

      it('should throw error for invalid refresh token', () => {
        expect(() => AuthService.verifyRefreshToken('invalid-token')).toThrow();
      });
    });

    describe('decodeToken', () => {
      it('should decode a valid token without verification', () => {
        const token = AuthService.generateAccessToken(testPayload);
        const decoded = AuthService.decodeToken(token);
        expect(decoded).toBeDefined();
        expect(decoded!.userId).toBe(testPayload.userId);
        expect(decoded!.email).toBe(testPayload.email);
      });

      it('should return null for invalid token', () => {
        const decoded = AuthService.decodeToken('invalid-token');
        expect(decoded).toBeNull();
      });
    });
  });
});

