// src/app/api/notifications/subscribe/route.test.ts
import { POST } from '@/app/api/notifications/subscribe/route';
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getCurrentUserId } from '@/lib/auth';
import httpMocks from 'node-mocks-http';
import type { NextRequest as NextRequestType, NextResponse as NextResponseType } from 'next/server'; 

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: {
    sadd: jest.fn(),
    smembers: jest.fn(), 
    srem: jest.fn(),   
  }
}));

// Mock getCurrentUserId
jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}));

// Mock the storage function
jest.mock('@/lib/notificationSubscriptionStorage', () => ({
    dbSaveSubscription: jest.fn(),
}));

// Simplify NextResponse mock to return a basic object structure
jest.mock('next/server', () => ({
    // We only need to mock the parts used by the route: NextResponse.json
    NextResponse: {
        json: jest.fn((body, init) => {
            const status = init?.status ?? 200;
            return {
                status: status,
                // Use standard Headers constructor
                headers: new Headers(init?.headers),
                // Provide the async json() method the tests expect
                json: async () => Promise.resolve(body),
                // Provide text() just in case
                text: async () => Promise.resolve(JSON.stringify(body)),
                // Provide ok status derived from status code
                ok: status >= 200 && status < 300,
            };
        }),
    },
    // Include other exports from next/server if they were needed (currently none seem required)
    // e.g., NextRequest: jest.requireActual('next/server').NextRequest 
}));

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Type cast the mocked NextResponse.json for potential assertions if needed
const mockedNextResponseJson = jest.requireMock('next/server').NextResponse.json as jest.Mock;

// Helper to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  const request = new NextRequest('http://localhost/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return request;
}

describe('POST /api/notifications/subscribe', () => {
  const mockUserId = 'test-user-123';
  const validSubscription = {
    endpoint: 'https://example.com/push/123',
    keys: {
      p256dh: 'p256dh_key',
      auth: 'auth_key',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUserId as jest.Mock).mockResolvedValue(mockUserId);
    (kv.sadd as jest.Mock).mockResolvedValue(1); 
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.unmock('next/server'); // Clean up mock
  });

  it('should return 401 if user is not authenticated', async () => {
    (getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);
    const request = createMockRequest({ subscription: validSubscription });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(kv.sadd).not.toHaveBeenCalled();
  });

  it('should return 400 if subscription object is invalid', async () => {
    const invalidSubscription = { endpoint: 'invalid' };
    const request = createMockRequest({ subscription: invalidSubscription });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid subscription object');
    expect(kv.sadd).not.toHaveBeenCalled();
  });

   it('should return 400 if body is not valid JSON', async () => {
     const request = new NextRequest('http://localhost/api/notifications/subscribe', {
       method: 'POST',
       body: 'invalid-json',
       headers: { 'Content-Type': 'application/json' },
     });
     const response = await POST(request);
     const json = await response.json();

     expect(response.status).toBe(400);
     expect(json.error).toBe('Invalid JSON body');
     expect(kv.sadd).not.toHaveBeenCalled();
   });

  it('should call kv.sadd with correct key and stringified subscription on success', async () => {
    const request = createMockRequest({ subscription: validSubscription });
    await POST(request);

    const expectedKey = `subscriptions:user:${mockUserId}`;
    const expectedValue = JSON.stringify(validSubscription);

    expect(kv.sadd).toHaveBeenCalledTimes(1);
    expect(kv.sadd).toHaveBeenCalledWith(expectedKey, expectedValue);
  });

  it('should return 201 and success message if kv.sadd is successful', async () => {
    const request = createMockRequest({ subscription: validSubscription });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.message).toBe('Subscription saved successfully');
  });

   it('should return 201 even if subscription already exists (kv.sadd returns 0)', async () => {
     (kv.sadd as jest.Mock).mockResolvedValueOnce(0);
     const request = createMockRequest({ subscription: validSubscription });
     const response = await POST(request);
     const json = await response.json();

     expect(response.status).toBe(201);
     expect(json.message).toBe('Subscription saved successfully');
   });

  it('should return 500 if kv.sadd throws an error', async () => {
    const kvError = new Error('KV Error');
    (kv.sadd as jest.Mock).mockRejectedValueOnce(kvError);
    const request = createMockRequest({ subscription: validSubscription });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Internal server error saving subscription');
  });
}); 