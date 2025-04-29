// src/app/api/notifications/unsubscribe/route.test.ts
import { POST } from './route';
import { dbDeleteSubscription } from '@/lib/notificationSubscriptionStorage';
import httpMocks from 'node-mocks-http';
import type { NextRequest } from 'next/server';

// Mock the storage function
jest.mock('@/lib/notificationSubscriptionStorage', () => ({
    dbDeleteSubscription: jest.fn(),
}));

// Simplify NextResponse mock (mirroring subscribe test)
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => {
            const status = init?.status ?? 200;
            return {
                status: status,
                headers: new Headers(init?.headers), // Use standard Headers
                json: async () => Promise.resolve(body),
                text: async () => Promise.resolve(JSON.stringify(body)),
                ok: status >= 200 && status < 300,
            };
        }),
    },
}));

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Type cast the mocked NextResponse.json
const mockedNextResponseJson = jest.requireMock('next/server').NextResponse.json as jest.Mock;

describe('POST /api/notifications/unsubscribe', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockedNextResponseJson.mockClear();
    });

     afterAll(() => {
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.unmock('next/server'); // Clean up mock
    });

    const validEndpoint = 'https://example.com/push/456';
    const validUserId = 'user-test-123';

    it('should return 400 if endpoint is missing', async () => {
        const testBody = { userId: validUserId }; // Missing endpoint
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            json: async () => Promise.resolve(testBody), // Add mock json()
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid subscription endpoint');
        expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Missing or invalid subscription endpoint' }, 
            { status: 400 }
        );
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });

    it('should return 400 if userId is missing', async () => {
        const testBody = { endpoint: validEndpoint }; // Missing userId
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
             json: async () => Promise.resolve(testBody), // Add mock json()
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid user ID');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Missing or invalid user ID' }, 
            { status: 400 }
        );
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });

    it('should call dbDeleteSubscription and return 200 on success', async () => {
        (dbDeleteSubscription as jest.Mock).mockResolvedValueOnce(undefined);
        const testBody = { userId: validUserId, endpoint: validEndpoint };
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            json: async () => Promise.resolve(testBody), // Add mock json()
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.message).toBe('Subscription deleted successfully');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { message: 'Subscription deleted successfully' }, 
            { status: 200 }
        );
        expect(dbDeleteSubscription).toHaveBeenCalledWith(validEndpoint);
    });

    it('should return 500 if dbDeleteSubscription fails', async () => {
        const dbError = new Error('DB delete failed');
        (dbDeleteSubscription as jest.Mock).mockRejectedValueOnce(dbError);
        const testBody = { userId: validUserId, endpoint: validEndpoint };
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
            json: async () => Promise.resolve(testBody), // Add mock json()
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(500);
        expect(body.error).toBe('Internal server error');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
        expect(dbDeleteSubscription).toHaveBeenCalledWith(validEndpoint);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[API Unsubscribe] Error processing unsubscription:', dbError);
    });
    
    it('should return 400 for invalid JSON body (simulate req.json() throwing)', async () => {
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/unsubscribe',
             // Mock json() to throw
            json: async () => { throw new SyntaxError('Invalid JSON'); }
        });
        const response = await POST(req as NextRequest);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid JSON body');
        expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Invalid JSON body' }, 
            { status: 400 }
        );
        expect(dbDeleteSubscription).not.toHaveBeenCalled();
    });
}); 