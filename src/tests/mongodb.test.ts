import mongoose from 'mongoose';
import { connectMongoDB, disconnectMongoDB } from '../database/mongodb';

jest.mock('mongoose');
jest.mock('../utils/logger');

describe('MongoDB Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectMongoDB', () => {
    it('should connect to MongoDB successfully', async () => {
      (mongoose.connect as jest.Mock).mockResolvedValue(undefined);
      const mockOn = jest.fn();
      Object.defineProperty(mongoose, 'connection', {
        value: { on: mockOn },
        writable: false,
        configurable: true,
      });

      await connectMongoDB();

      expect(mongoose.connect).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (mongoose.connect as jest.Mock).mockRejectedValue(error);

      await expect(connectMongoDB()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnectMongoDB', () => {
    it('should disconnect from MongoDB successfully', async () => {
      (mongoose.disconnect as jest.Mock).mockResolvedValue(undefined);

      await disconnectMongoDB();

      expect(mongoose.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnection failed');
      (mongoose.disconnect as jest.Mock).mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(disconnectMongoDB()).resolves.not.toThrow();
    });
  });
});

