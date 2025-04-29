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

// Helper to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  const request = new NextRequest('http://localhost/api/notifications/unsubscribe', {
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
     const request = new NextRequest('http://localhost/api/notifications/unsubscribe', {
       method: 'POST',
       body: 'invalid-json',
       headers: { 'Content-Type': 'application/json' },
     });
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

    it('should handle errors parsing subscription JSON strings', async () => {
       (kv.smembers as jest.Mock).mockResolvedValueOnce([subToRemoveString, 'invalid-json']);
       const request = createMockRequest({ endpoint: endpointToRemove });
       const response = await POST(request);
       const json = await response.json();
        
       expect(kv.srem).toHaveBeenCalledTimes(1);
       expect(kv.srem).toHaveBeenCalledWith(`subscriptions:user:${mockUserId}`, subToRemoveString);
       expect(response.status).toBe(200);
       expect(json.message).toBe('Subscription removed successfully');
    });

}); 