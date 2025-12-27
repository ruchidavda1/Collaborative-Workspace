import { Request, Response } from 'express';
import { AuthController } from '../controllers/authController';
import { AppDataSource } from '../database/postgres';
import { AuthService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

// Mock dependencies
jest.mock('../database/postgres');
jest.mock('../services/authService');
jest.mock('../utils/logger');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockRepository: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockRequest.body = userData;
      mockRepository.findOne.mockResolvedValue(null);
      
      const mockUser = {
        id: '1',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };
      
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      
      (AuthService.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      (AuthService.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (AuthService.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: userData.email,
            }),
            accessToken: 'accessToken',
            refreshToken: 'refreshToken',
          }),
        })
      );
    });

    it('should throw error if user already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockRepository.findOne.mockResolvedValue({ email: 'existing@example.com' });

      await expect(
        AuthController.register(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        lastLoginAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      (AuthService.comparePassword as jest.Mock).mockResolvedValue(true);
      (AuthService.generateAccessToken as jest.Mock).mockReturnValue('accessToken');
      (AuthService.generateRefreshToken as jest.Mock).mockReturnValue('refreshToken');

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            accessToken: 'accessToken',
            refreshToken: 'refreshToken',
          }),
        })
      );
    });

    it('should throw error for invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });

    it('should throw error for inactive user', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockRepository.findOne.mockResolvedValue({
        isActive: false,
      });

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });

    it('should throw error for incorrect password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      (AuthService.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        AuthController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'validRefreshToken';
      mockRequest.body = { refreshToken };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        refreshToken,
      };

      (AuthService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: '1',
        email: 'test@example.com',
      });
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);
      (AuthService.generateAccessToken as jest.Mock).mockReturnValue('newAccessToken');
      (AuthService.generateRefreshToken as jest.Mock).mockReturnValue('newRefreshToken');

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          data: expect.objectContaining({
            accessToken: 'newAccessToken',
            refreshToken: 'newRefreshToken',
          }),
        })
      );
    });

    it('should throw error for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalidToken' };

      (AuthService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: '1',
        email: 'test@example.com',
      });
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        AuthController.refreshToken(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if refresh token does not match', async () => {
      mockRequest.body = { refreshToken: 'token1' };

      (AuthService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: '1',
        email: 'test@example.com',
      });
      mockRepository.findOne.mockResolvedValue({
        id: '1',
        refreshToken: 'differentToken',
      });

      await expect(
        AuthController.refreshToken(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer validToken',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        refreshToken: 'someToken',
      };

      (AuthService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: '1',
        email: 'test@example.com',
      });
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      await AuthController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful',
        })
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error if no token provided', async () => {
      mockRequest.headers = {};

      await expect(
        AuthController.logout(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });
});

