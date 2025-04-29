// src/app/api/notifications/unsubscribe/route.test.ts
import { POST } from '@/app/api/notifications/unsubscribe/route';
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getCurrentUserId } from '@/lib/auth';

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

// --- Add Mock for next/server --- 
jest.mock('next/server', () => ({
    // We only need to mock the parts used by the route: NextResponse.json
    NextResponse: {
        json: jest.fn((body, init) => {
            const status = init?.status ?? 200;
            // Return an object that mimics the structure tests expect
            return {
                status: status,
                headers: new Headers(init?.headers),
                // Provide the async json() method
                json: async () => Promise.resolve(body),
                // Provide text() as well for robustness
                text: async () => Promise.resolve(JSON.stringify(body)),
                ok: status >= 200 && status < 300,
            };
        }),
    },
    // Mock NextRequest minimally if needed, or use the real one
    // Using requireActual might be safer if only NextResponse needs mocking
    NextRequest: jest.requireActual('next/server').NextRequest 
}));
// --- End Mock --- 

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Type cast the mocked NextResponse.json if needed for assertions
// const mockedNextResponseJson = jest.requireMock('next/server').NextResponse.json as jest.Mock;

// Helper to create a mock NextRequest (using the actual NextRequest via mock)
function createMockRequest(body: any): NextRequest {
  const request = new (jest.requireActual('next/server').NextRequest)('http://localhost/api/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return request;
}

describe('POST /api/notifications/unsubscribe', () => {
  const mockUserId = 'test-user-456';
  const endpointToRemove = 'https://example.com/push/endpoint-to-remove';
  const otherEndpoint = 'https://example.com/push/other-endpoint';
  
  const subToRemoveString = JSON.stringify({ endpoint: endpointToRemove, keys: { p256dh: 'key1', auth: 'auth1' } });
  const otherSubString = JSON.stringify({ endpoint: otherEndpoint, keys: { p256dh: 'key2', auth: 'auth2' } });

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentUserId as jest.Mock).mockResolvedValue(mockUserId);
    (kv.smembers as jest.Mock).mockResolvedValue([subToRemoveString, otherSubString]);
    (kv.srem as jest.Mock).mockResolvedValue(1); 
  });

  afterAll(() => {
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      jest.unmock('next/server'); // Clean up mock
    });

  it('should return 401 if user is not authenticated', async () => {
    (getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);
    const request = createMockRequest({ endpoint: endpointToRemove });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(kv.smembers).not.toHaveBeenCalled();
    expect(kv.srem).not.toHaveBeenCalled();
  });

  it('should return 400 if endpoint is missing or invalid', async () => {
    const request = createMockRequest({ endpoint: '' }); 
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid or missing subscription endpoint');
    expect(kv.smembers).not.toHaveBeenCalled();
    expect(kv.srem).not.toHaveBeenCalled();
  });

   it('should return 400 if body is not valid JSON', async () => {
     const request = createMockRequest('invalid-json'); 
     (request as any)._body = 'invalid-json'; 
     (request.json as jest.Mock) = jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"));

     const response = await POST(request);
     const json = await response.json();

     expect(response.status).toBe(400);
     expect(json.error).toBe('Invalid JSON body');
     expect(kv.smembers).not.toHaveBeenCalled();
     expect(kv.srem).not.toHaveBeenCalled();
   });

  it('should call kv.smembers with the correct user key', async () => {
    const request = createMockRequest({ endpoint: endpointToRemove });
    await POST(request);
    const expectedKey = `subscriptions:user:${mockUserId}`;
    expect(kv.smembers).toHaveBeenCalledTimes(1);
    expect(kv.smembers).toHaveBeenCalledWith(expectedKey);
  });

  it('should call kv.srem with the correct key and stringified subscription when endpoint matches', async () => {
    const request = createMockRequest({ endpoint: endpointToRemove });
    await POST(request);
    const expectedKey = `subscriptions:user:${mockUserId}`;
    expect(kv.srem).toHaveBeenCalledTimes(1);
    expect(kv.srem).toHaveBeenCalledWith(expectedKey, subToRemoveString);
  });

  it('should not call kv.srem if endpoint does not match any stored subscription', async () => {
    const request = createMockRequest({ endpoint: 'non-existent-endpoint' });
    await POST(request);
    expect(kv.srem).not.toHaveBeenCalled();
  });

  it('should return 200 and success message if subscription is found and removed', async () => {
    const request = createMockRequest({ endpoint: endpointToRemove });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Subscription removed successfully');
  });

  it('should return 200 and not found message if subscription endpoint is not found', async () => {
    const request = createMockRequest({ endpoint: 'non-existent-endpoint' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe('Subscription not found or already removed');
    expect(kv.srem).not.toHaveBeenCalled();
  });

   it('should handle errors during kv.smembers call', async () => {
     const kvError = new Error('KV smembers Error');
     (kv.smembers as jest.Mock).mockRejectedValueOnce(kvError);
     const request = createMockRequest({ endpoint: endpointToRemove });
     const response = await POST(request);
     const json = await response.json();

     expect(response.status).toBe(500);
     expect(json.error).toBe('Internal server error removing subscription');
     expect(kv.srem).not.toHaveBeenCalled();
   });

    it('should handle errors during kv.srem call', async () => {
      const kvError = new Error('KV srem Error');
      (kv.srem as jest.Mock).mockRejectedValueOnce(kvError);
      const request = createMockRequest({ endpoint: endpointToRemove });
      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Internal server error removing subscription');
    });

    it('should handle errors parsing subscription JSON strings and still return success if target not found', async () => {
       // Arrange: 
       // - Target endpoint does NOT match the valid stored subscription.
       // - Stored subscriptions contain a valid one AND an invalid JSON string.
       const endpointNotInStore = 'https://example.com/push/not-in-store';
       const validSubStored = { endpoint: 'https://example.com/push/valid-stored', keys: { p256dh: 'valid_key', auth: 'valid_auth' } };
       const validSubStoredString = JSON.stringify(validSubStored);
       const invalidJsonString = '{\"endpoint\": invalid}'; // Example invalid JSON

       (kv.smembers as jest.Mock).mockResolvedValueOnce([validSubStoredString, invalidJsonString]);
       const request = createMockRequest({ endpoint: endpointNotInStore });

       // Action
       const response = await POST(request);
       const json = await response.json();
        
       // Assert:
       // - kv.srem should NOT have been called because endpointNotInStore was never matched.
       expect(kv.srem).not.toHaveBeenCalled(); 
       // - The loop should have continued after the validSubStoredString, encountered invalidJsonString, and logged the error.
       expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // Expect the error to be logged
       expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing subscription string'), expect.any(SyntaxError));
       // - Since the target endpoint wasn't found (and no internal error occurred), status should be 200.
       expect(response.status).toBe(200);
       expect(json.message).toBe('Subscription not found or already removed'); 
    });

}); 