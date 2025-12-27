import { Request, Response, NextFunction } from 'express';
import { validate, sanitizeInput } from '../middleware/validator';
import { validationResult, ValidationChain } from 'express-validator';

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

describe('Validator Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should call next() when validation passes', async () => {
      const mockValidation = {
        run: jest.fn().mockResolvedValue(undefined),
      } as unknown as ValidationChain;

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      const middleware = validate([mockValidation]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      const mockValidation = {
        run: jest.fn().mockResolvedValue(undefined),
      } as unknown as ValidationChain;

      const mockErrors = [
        { msg: 'Invalid email', param: 'email' },
        { msg: 'Password required', param: 'password' },
      ];

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      const middleware = validate([mockValidation]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: mockErrors,
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle multiple validations', async () => {
      const mockValidation1 = {
        run: jest.fn().mockResolvedValue(undefined),
      } as unknown as ValidationChain;

      const mockValidation2 = {
        run: jest.fn().mockResolvedValue(undefined),
      } as unknown as ValidationChain;

      (validationResult as unknown as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      const middleware = validate([mockValidation1, mockValidation2]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockValidation1.run).toHaveBeenCalledWith(mockRequest);
      expect(mockValidation2.run).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      const result = sanitizeInput('  test  ');
      expect(result).toBe('test');
    });

    it('should remove HTML tags', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should remove angle brackets', () => {
      const result = sanitizeInput('hello<world>test');
      expect(result).toBe('helloworldtest');
    });

    it('should handle empty string', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('should handle string with only spaces', () => {
      const result = sanitizeInput('   ');
      expect(result).toBe('');
    });

    it('should preserve normal text', () => {
      const result = sanitizeInput('Hello World 123');
      expect(result).toBe('Hello World 123');
    });

    it('should handle special characters except angle brackets', () => {
      const result = sanitizeInput('test@email.com!#$%');
      expect(result).toBe('test@email.com!#$%');
    });
  });
});

