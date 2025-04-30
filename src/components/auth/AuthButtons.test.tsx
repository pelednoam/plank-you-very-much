import { render, screen } from '@testing-library/react';
import { AuthButtons } from './AuthButtons';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react');

// Mock child components to isolate AuthButtons logic
jest.mock('./SignInButton', () => ({ SignInButton: () => <button>Sign In</button> }));
jest.mock('./SignOutButton', () => ({ SignOutButton: () => <button>Sign Out</button> }));
jest.mock('@/components/ui/avatar', () => ({
    Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, // Simple div wrapper
    AvatarImage: ({ src, alt }: { src?: string, alt?: string }) => <img src={src} alt={alt} data-testid="avatar-image" />,
    AvatarFallback: ({ children }: { children: React.ReactNode }) => <div data-testid="avatar-fallback">{children}</div>,
}));
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div data-testid="skeleton">Skeleton Loader</div> }));

describe('AuthButtons', () => {
    const mockUseSession = useSession as jest.Mock;

    beforeEach(() => {
        // Reset mocks before each test
        mockUseSession.mockClear();
    });

    test('renders skeleton loaders when session status is loading', () => {
        mockUseSession.mockReturnValue({ status: 'loading', data: null });
        render(<AuthButtons />);
        
        const skeletons = screen.getAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(0); // Check if at least one skeleton is present
        expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
        expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });

    test('renders SignInButton when session status is unauthenticated', () => {
        mockUseSession.mockReturnValue({ status: 'unauthenticated', data: null });
        render(<AuthButtons />);
        
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
        expect(screen.queryByTestId('avatar-image')).not.toBeInTheDocument();
    });

    test('renders SignOutButton and user info when session status is authenticated', () => {
        const mockSession = {
            user: {
                name: 'Test User',
                email: 'test@example.com',
                image: 'http://example.com/avatar.jpg',
            },
        };
        mockUseSession.mockReturnValue({ status: 'authenticated', data: mockSession });
        render(<AuthButtons />);

        expect(screen.getByText('Sign Out')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument(); // Check name is displayed
        
        const avatarImage = screen.getByTestId('avatar-image') as HTMLImageElement;
        expect(avatarImage).toBeInTheDocument();
        expect(avatarImage.src).toBe(mockSession.user.image);
        expect(avatarImage.alt).toContain('Test User'); // Alt text might include more

        expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    test('renders fallback avatar when authenticated user has no image', () => {
         const mockSession = {
             user: {
                 name: 'No Image User',
                 email: 'no-image@example.com',
                 image: null, // No image
             },
         };
         mockUseSession.mockReturnValue({ status: 'authenticated', data: mockSession });
         render(<AuthButtons />);
 
         expect(screen.getByText('Sign Out')).toBeInTheDocument();
         expect(screen.getByText('No Image User')).toBeInTheDocument();
         expect(screen.queryByTestId('avatar-image')).toBeInTheDocument(); // img tag might still render
         
         const fallback = screen.getByTestId('avatar-fallback');
         expect(fallback).toBeInTheDocument();
         expect(fallback).toHaveTextContent('N'); // First initial of name
     });

     test('renders email initial in fallback avatar when authenticated user has no image or name', () => {
        const mockSession = {
            user: {
                name: null,
                email: 'only.email@example.com',
                image: null,
            },
        };
        mockUseSession.mockReturnValue({ status: 'authenticated', data: mockSession });
        render(<AuthButtons />);

        expect(screen.getByText('Sign Out')).toBeInTheDocument();
        expect(screen.getByText('only.email@example.com')).toBeInTheDocument(); // Display email
        
        const fallback = screen.getByTestId('avatar-fallback');
        expect(fallback).toBeInTheDocument();
        expect(fallback).toHaveTextContent('O'); // First initial of email
    });
}); 