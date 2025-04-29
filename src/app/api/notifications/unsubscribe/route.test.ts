// src/app/api/notifications/unsubscribe/route.test.ts
import { POST } from './route';
import { dbDeleteSubscription } from '@/lib/notificationSubscriptionStorage';
import httpMocks from 'node-mocks-http';
import type { NextRequest } from 'next/server';

// Mock the storage function
jest.mock('@/lib/notificationSubscriptionStorage', () => ({
    dbDeleteSubscription: jest.fn(),
}));

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe.skip('POST /api/notifications/unsubscribe', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

     afterAll(() => {
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    const validEndpoint = 'https://example.com/push/456';
    const validUserId = 'user-test-123';

    it('should return 400 if endpoint is missing', async () => {
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            body: { userId: validUserId },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid subscription endpoint');
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });

    it('should return 400 if userId is missing', async () => {
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            body: { endpoint: validEndpoint },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid user ID');
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });

    it('should call dbDeleteSubscription and return 200 on success', async () => {
        (dbDeleteSubscription as jest.Mock).mockResolvedValueOnce(undefined);
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            body: { userId: validUserId, endpoint: validEndpoint },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.message).toBe('Subscription deleted successfully');
        expect(dbDeleteSubscription).toHaveBeenCalledWith(validEndpoint);
    });

    it('should return 500 if dbDeleteSubscription fails', async () => {
        const dbError = new Error('DB delete failed');
        (dbDeleteSubscription as jest.Mock).mockRejectedValueOnce(dbError);
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            body: { userId: validUserId, endpoint: validEndpoint },
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(500);
        expect(body.error).toBe('Internal server error');
        expect(dbDeleteSubscription).toHaveBeenCalledWith(validEndpoint);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[API Unsubscribe] Error processing unsubscription:', dbError);
    });
    
    it('should return 400 for invalid JSON body (simulate req.json() throwing)', async () => {
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            json: async () => { throw new SyntaxError('Invalid JSON'); }
        });
        const response = await POST(req as NextRequest);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid JSON body');
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });
}); 