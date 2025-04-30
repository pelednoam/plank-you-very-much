import '@testing-library/jest-dom';

declare global {
    namespace jest {
        // Extend Jest matchers with jest-dom types
        // This helps TypeScript recognize the custom matchers like .toBeInTheDocument()
        interface Matchers<R> extends import('@testing-library/jest-dom').matchers.TestingLibraryMatchers<typeof expect.stringContaining, R> {}
    }
}

// Export something to make it a module (required by TypeScript)
export {}; 