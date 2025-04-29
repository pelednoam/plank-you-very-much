import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import { useTheme } from '@/store/themeStore'; // Corrected path with alias

// Mock the useTheme hook
jest.mock('@/store/themeStore', () => ({ // Corrected path with alias
  useTheme: jest.fn(),
}));

// Helper to render with Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Header Component', () => {
  let mockSetTheme: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    mockSetTheme = jest.fn();
    (useTheme as jest.Mock).mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
  });

  test('renders the app name link correctly', () => {
    renderWithRouter(<Header />);
    // Check for the link with the name "PeakForm"
    const appNameLink = screen.getByRole('link', { name: /PeakForm/i });
    expect(appNameLink).toBeInTheDocument();
    expect(appNameLink).toHaveAttribute('href', '/');
  });

  test('renders the theme toggle button and handles click', () => {
    renderWithRouter(<Header />);
    // Initial state (light)
    const toggleButton = screen.getByRole('button', { name: /Switch Theme/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent('☀️'); // Light mode icon

    // Click to toggle to dark
    fireEvent.click(toggleButton);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    // Simulate theme changing to dark
    (useTheme as jest.Mock).mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    renderWithRouter(<Header />); // Re-render might be needed if icon depends on state directly
    expect(screen.getByRole('button', { name: /Switch Theme/i })).toHaveTextContent('🌙');

    // Click to toggle to system
    fireEvent.click(screen.getByRole('button', { name: /Switch Theme/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
    
     // Simulate theme changing to system
    (useTheme as jest.Mock).mockReturnValue({ theme: 'system', setTheme: mockSetTheme });
    renderWithRouter(<Header />); 
    expect(screen.getByRole('button', { name: /Switch Theme/i })).toHaveTextContent('💻');

     // Click to toggle back to light
    fireEvent.click(screen.getByRole('button', { name: /Switch Theme/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  // Remove the test for navigation links as they are in Sidebar
  // test('renders navigation links', () => { ... });
}); 