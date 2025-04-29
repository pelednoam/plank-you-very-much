import { authConfig } from '@/../auth.config'; // Adjust path as necessary
import Credentials from 'next-auth/providers/credentials';
import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';
import type { User } from 'next-auth';

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    // Add other methods if needed by other parts of authConfig, though unlikely for authorize
  }
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Helper to get the authorize function from the config
const credentialsProvider = authConfig.providers.find(
  provider => provider.type === 'credentials'
) as ReturnType<typeof Credentials>;
const authorize = credentialsProvider.authorize;

// Define a mock StoredUser type similar to the one in auth.config.ts
interface MockStoredUser {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  passwordHash?: string | null;
}

describe('Credentials Authorize Function', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  const testUserId = 'user-123';
  const correctHash = '$2b$10$abcdefghijklmnopqrstuv'; // Example hash

  const mockCredentials = {
    email: testEmail,
    password: testPassword,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default behavior before each test
    (kv.get as jest.Mock).mockResolvedValue(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  });

  it('should return null if email is missing', async () => {
    const result = await authorize({ ...mockCredentials, email: undefined }, {} as any);
    expect(result).toBeNull();
    expect(kv.get).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should return null if password is missing', async () => {
    const result = await authorize({ ...mockCredentials, password: undefined }, {} as any);
    expect(result).toBeNull();
    expect(kv.get).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should call kv.get with the correct user key', async () => {
    await authorize(mockCredentials, {} as any);
    const expectedKey = `user:email:${testEmail.toLowerCase()}`;
    expect(kv.get).toHaveBeenCalledTimes(1);
    expect(kv.get).toHaveBeenCalledWith(expectedKey);
  });

  it('should return null if user is not found in KV', async () => {
    (kv.get as jest.Mock).mockResolvedValue(null);
    const result = await authorize(mockCredentials, {} as any);
    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should return null if user found but has no passwordHash (OAuth user)', async () => {
    const mockOAuthUser: MockStoredUser = {
      id: testUserId,
      email: testEmail,
      name: 'Test OAuth User',
      passwordHash: null, // No password hash
    };
    (kv.get as jest.Mock).mockResolvedValue(mockOAuthUser);

    const result = await authorize(mockCredentials, {} as any);
    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('should call bcrypt.compare with correct password and hash if user and hash exist', async () => {
    const mockCredentialsUser: MockStoredUser = {
      id: testUserId,
      email: testEmail,
      name: 'Test Cred User',
      passwordHash: correctHash,
    };
    (kv.get as jest.Mock).mockResolvedValue(mockCredentialsUser);

    await authorize(mockCredentials, {} as any);
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    expect(bcrypt.compare).toHaveBeenCalledWith(testPassword, correctHash);
  });

  it('should return null if password comparison fails', async () => {
    const mockCredentialsUser: MockStoredUser = {
      id: testUserId,
      email: testEmail,
      passwordHash: correctHash,
    };
    (kv.get as jest.Mock).mockResolvedValue(mockCredentialsUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Simulate wrong password

    const result = await authorize(mockCredentials, {} as any);
    expect(result).toBeNull();
  });

  it('should return user object if password comparison succeeds', async () => {
    const mockCredentialsUser: MockStoredUser = {
      id: testUserId,
      email: testEmail,
      name: 'Test User',
      image: 'test.jpg',
      passwordHash: correctHash,
    };
    (kv.get as jest.Mock).mockResolvedValue(mockCredentialsUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Simulate correct password

    const expectedUser: User = {
      id: testUserId,
      name: 'Test User',
      email: testEmail,
      image: 'test.jpg',
    };

    const result = await authorize(mockCredentials, {} as any);
    expect(result).toEqual(expectedUser);
  });

  it('should return null if kv.get throws an error', async () => {
    const kvError = new Error('KV Get Error');
    (kv.get as jest.Mock).mockRejectedValue(kvError);

    const result = await authorize(mockCredentials, {} as any);
    expect(result).toBeNull();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    // Optional: Check if the error was logged (would require mocking console.error)
  });

  it('should return null if bcrypt.compare throws an error', async () => {
    const mockCredentialsUser: MockStoredUser = {
      id: testUserId,
      email: testEmail,
      passwordHash: correctHash,
    };
    (kv.get as jest.Mock).mockResolvedValue(mockCredentialsUser);
    const bcryptError = new Error('Bcrypt Compare Error');
    (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

    const result = await authorize(mockCredentials, {} as any);
    expect(result).toBeNull();
    // Optional: Check if the error was logged
  });
}); 