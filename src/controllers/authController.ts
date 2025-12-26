import { Request, Response } from 'express';
import { AppDataSource } from '../database/postgres';
import { User } from '../database/entities/User';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const existingUser = await userRepository.findOne({ where: { email } });

      if (existingUser) {
        throw new AppError('User already exists', 400);
      }

      const hashedPassword = await AuthService.hashPassword(password);

      const user = userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      await userRepository.save(user);

      const accessToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshToken = AuthService.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      user.refreshToken = refreshToken;
      await userRepository.save(user);

      logger.info(`User registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          accessToken,
          refreshToken,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });

      if (!user || !user.isActive) {
        throw new AppError('Invalid credentials', 401);
      }

      const isPasswordValid = await AuthService.comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      const accessToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshToken = AuthService.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      user.refreshToken = refreshToken;
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          accessToken,
          refreshToken,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500);
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const decoded = AuthService.verifyRefreshToken(refreshToken);

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: decoded.userId } });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      const newAccessToken = AuthService.generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const newRefreshToken = AuthService.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      user.refreshToken = newRefreshToken;
      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Token refresh error:', error);
      throw new AppError('Token refresh failed', 401);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('No token provided', 401);
      }

      const token = authHeader.substring(7);
      const decoded = AuthService.verifyAccessToken(token);

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: decoded.userId } });

      if (user) {
        user.refreshToken = undefined;
        await userRepository.save(user);
      }

      logger.info(`User logged out: ${decoded.email}`);

      res.json({
        success: true,
        message: 'Logout successful',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Logout error:', error);
      throw new AppError('Logout failed', 500);
    }
  }
}

