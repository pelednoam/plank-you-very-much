// src/app/api/notifications/subscribe/route.test.ts
import { POST } from './route';
import { dbSaveSubscription } from '@/lib/notificationSubscriptionStorage';
import httpMocks from 'node-mocks-http';
import type { NextRequest, NextResponse as NextResponseType } from 'next/server'; 

// Mock the storage function
jest.mock('@/lib/notificationSubscriptionStorage', () => ({
    dbSaveSubscription: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => {
    // Keep original exports except for NextResponse
    const originalModule = jest.requireActual('next/server'); 
    return {
        ...originalModule,
        NextResponse: {
            // Mock the static json method
            json: jest.fn((body, init) => {
                // Return an object that mimics the Response structure needed by the tests
                return {
                    status: init?.status || 200,
                    headers: new Headers(init?.headers),
                    json: async () => Promise.resolve(body), // Method to get the body
                    text: async () => Promise.resolve(JSON.stringify(body)),
                    ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
                    // Add other Response properties/methods if needed by tests
                };
            }),
        },
    };
});

// Mock console
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Type cast the mocked NextResponse.json for potential assertions if needed
const mockedNextResponseJson = jest.requireMock('next/server').NextResponse.json as jest.Mock;

describe('POST /api/notifications/subscribe', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear the NextResponse mock calls too
        mockedNextResponseJson.mockClear(); 
    });

    afterAll(() => {
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.unmock('next/server'); // Clean up mock
    });

    const mockSubscription = {
        endpoint: 'https://example.com/push/123',
        keys: { p256dh: 'key1', auth: 'auth1' },
    };

    it('should call NextResponse.json with 400 if userId is missing', async () => {
        const testBody = { subscription: mockSubscription }; // Missing userId
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            // Add a json method to the mock request
            json: async () => Promise.resolve(testBody), 
        });
        
        const response = await POST(req);
        const body = await response.json(); // This now works due to the mock

        expect(response.status).toBe(400);
        expect(body.error).toBe('Missing or invalid user ID');
        // Verify NextResponse.json was called with the correct arguments
        expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Missing or invalid user ID' }, 
            { status: 400 }
        );
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });

    it('should call NextResponse.json with 400 if subscription object is invalid (missing endpoint)', async () => {
        const invalidSub = { keys: { p256dh: 'key1', auth: 'auth1' } };
        const testBody = { userId: 'user1', subscription: invalidSub };
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            json: async () => Promise.resolve(testBody),
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid subscription object');
        expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Invalid subscription object' }, 
            { status: 400 }
        );
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });
    
    it('should call NextResponse.json with 400 if subscription object is invalid (missing keys)', async () => {
        const invalidSub = { endpoint: 'https://example.com/push/123' };
        const testBody = { userId: 'user1', subscription: invalidSub };
         const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            json: async () => Promise.resolve(testBody),
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toBe('Invalid subscription object');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Invalid subscription object' }, 
            { status: 400 }
        );
        expect(dbSaveSubscription).not.toHaveBeenCalled();
    });

    it('should call dbSaveSubscription and NextResponse.json with 201 on success', async () => {
        (dbSaveSubscription as jest.Mock).mockResolvedValueOnce(undefined);
        const testBody = { userId: 'user1', subscription: mockSubscription };
         const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            json: async () => Promise.resolve(testBody),
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(201);
        expect(body.message).toBe('Subscription saved successfully');
        expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { message: 'Subscription saved successfully' }, 
            { status: 201 }
        );
        expect(dbSaveSubscription).toHaveBeenCalledWith('user1', mockSubscription);
    });

    it('should call NextResponse.json with 500 if dbSaveSubscription fails', async () => {
        const dbError = new Error('Database error');
        (dbSaveSubscription as jest.Mock).mockRejectedValueOnce(dbError);
        const testBody = { userId: 'user1', subscription: mockSubscription };
        const req = httpMocks.createRequest<NextRequest>({
            method: 'POST',
            url: '/api/notifications/subscribe',
            json: async () => Promise.resolve(testBody),
        });
        const response = await POST(req);
        const body = await response.json();
        expect(response.status).toBe(500);
        expect(body.error).toBe('Internal server error');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Internal server error' }, 
            { status: 500 }
        );
        expect(dbSaveSubscription).toHaveBeenCalledWith('user1', mockSubscription);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[API Subscribe] Error processing subscription:', dbError);
    });

     it('should call NextResponse.json with 400 for invalid JSON body (simulate req.json() throwing)', async () => {
         const req = httpMocks.createRequest<NextRequest>({
             method: 'POST',
             url: '/api/notifications/subscribe',
             // Mock json() to throw, simulating a parsing error
             json: async () => { throw new SyntaxError('Unexpected token i in JSON at position 1'); }
         });
         const response = await POST(req as NextRequest);
         const body = await response.json();
         expect(response.status).toBe(400);
         expect(body.error).toBe('Invalid JSON body');
         expect(mockedNextResponseJson).toHaveBeenCalledWith(
            { error: 'Invalid JSON body' }, 
            { status: 400 }
        );
         expect(dbSaveSubscription).not.toHaveBeenCalled();
    });
}); 