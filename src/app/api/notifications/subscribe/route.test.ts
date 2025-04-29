// src/app/api/notifications/subscribe/route.test.ts
import { POST } from './route';
import { dbSaveSubscription } from '@/lib/notificationSubscriptionStorage';
import httpMocks from 'node-mocks-http';
import type { NextRequest } from 'next/server'; // Keep type for handler signature

// Mock the storage function
jest.mock('@/lib/notificationSubscriptionStorage', () => ({
    dbSaveSubscription: jest.fn(),
}));

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe.skip('POST /api/notifications/subscribe', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    const mockSubscription = {
        endpoint: 'https://example.com/push/123',
        keys: { p256dh: 'key1', auth: 'auth1' },
    };

    it('should return 400 if userId is missing', async () => {
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            body: { subscription: mockSubscription }, // Send body directly
        });
        // Route handlers using NextResponse often don't need a mock response object passed in
        const response = await POST(req);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid user ID');
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });

    it('should return 400 if subscription object is invalid (missing endpoint)', async () => {
        const invalidSub = { keys: { p256dh: 'key1', auth: 'auth1' } };
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            body: { userId: 'user1', subscription: invalidSub },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid subscription object');
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });
    
    it('should return 400 if subscription object is invalid (missing keys)', async () => {
        const invalidSub = { endpoint: 'https://example.com/push/123' };
         const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            body: { userId: 'user1', subscription: invalidSub },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid subscription object');
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });

    it('should call dbSaveSubscription and return 201 on success', async () => {
        (dbSaveSubscription as jest.Mock).mockResolvedValueOnce(undefined);
         const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            body: { userId: 'user1', subscription: mockSubscription },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(201);
        expect(body.message).toBe('Subscription saved successfully');
        expect(dbSaveSubscription).toHaveBeenCalledWith('user1', mockSubscription);
    });

    it('should return 500 if dbSaveSubscription fails', async () => {
        const dbError = new Error('Database error');
        (dbSaveSubscription as jest.Mock).mockRejectedValueOnce(dbError);
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            body: { userId: 'user1', subscription: mockSubscription },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(500);
        expect(body.error).toBe('Internal server error');
        expect(dbSaveSubscription).toHaveBeenCalledWith('user1', mockSubscription);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[API Subscribe] Error processing subscription:', dbError);
    });

     it('should return 400 for invalid JSON body (simulate req.json() throwing)', async () => {
         // node-mocks-http doesn't directly simulate body parsing errors easily.
         // We'll test the handler's catch block by making the mocked function throw.
         // A more accurate test might involve passing malformed raw body data if possible.
         const req = httpMocks.createRequest<NextRequest>({
             method: 'POST',
             url: '/api/notifications/subscribe',
             // Simulate json() failing
             json: async () => { throw new SyntaxError('Unexpected token i in JSON at position 1'); }
         });
         // Need to manually cast here as we overrode json
         const response = await POST(req as NextRequest);
         const body = await response.json();
         expect(response.status).toBe(400);
         expect(body.error).toBe('Invalid JSON body');
         expect(dbSaveSubscription).not.toHaveBeenCalled();
    });
}); 