import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CsvImportButton } from './CsvImportButton';
import { useMetricsStore } from '@/store/metricsStore';
import { toast } from 'sonner';
import type { BodyMetrics } from '@/types';

// --- Mock Store --- 
// Keep track of the mock function outside the mock definition
const mockImportMetricsFn = jest.fn();

// Mock the entire store state/actions returned by the hook selector
jest.mock('@/store/metricsStore', () => ({
  useMetricsStore: jest.fn((selector) => {
    // The state object that the selector operates on
    const mockState = {
        metrics: [], // Add other state properties if needed by component/selector
        importMetrics: mockImportMetricsFn, 
        // Add other actions if needed
    };
    // Execute the selector passed to the hook against the mock state
    return selector(mockState);
  }),
}));

// --- Mock Sonner --- 
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// --- Simplified FileReader Mock --- 
// Store captured handlers globally within the test file scope
let capturedOnload: ((ev: ProgressEvent<FileReader>) => any) | null = null;
let capturedOnerror: ((ev: ProgressEvent<FileReader>) => any) | null = null;
const mockReadAsText = jest.fn();

const mockFileReaderConstructor = jest.fn().mockImplementation(() => {
  // The mock instance only needs readAsText and allows setting handlers
  const mockInstance = {
    readAsText: mockReadAsText,
    // Event handlers are assignable
    set onload(handler: ((ev: ProgressEvent<FileReader>) => any) | null) {
      capturedOnload = handler;
    },
    get onload() {
        return capturedOnload;
    },
    set onerror(handler: ((ev: ProgressEvent<FileReader>) => any) | null) {
      capturedOnerror = handler;
    },
     get onerror() {
        return capturedOnerror;
    },
    // Add other properties if component logic checks them (e.g., readyState), otherwise minimal is fine
    readyState: 0,
    result: null, 
  };
  return mockInstance;
});

beforeAll(() => {
  Object.defineProperty(window, 'FileReader', {
    writable: true,
    value: mockFileReaderConstructor,
  });
});

beforeEach(() => {
  // Reset mocks
  // Reset the store mock implementation for each test
  mockImportMetricsFn.mockClear().mockImplementation(() => ({ added: 0, duplicates: 0 })); 
  // Also reset the main hook mock itself if needed, although maybe not necessary here
  // (useMetricsStore as jest.Mock).mockClear(); 
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  (toast.warning as jest.Mock).mockClear();
  mockFileReaderConstructor.mockClear();
  mockReadAsText.mockClear();
  capturedOnload = null;
  capturedOnerror = null;
});
// --- End Simplified FileReader Mock --- 

describe('CsvImportButton', () => {

  test('renders button with correct text and icon', () => {
    render(<CsvImportButton source="WYZE" />);
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).toBeInTheDocument();
  });
  
  test('clicking button triggers hidden file input', () => {
      render(<CsvImportButton source="WYZE" />);
      const button = screen.getByRole('button');
      const fileInput = screen.getByTestId('csv-file-input'); 
      const inputClickMock = jest.fn();
      fileInput.click = inputClickMock;
  
      fireEvent.click(button);
      expect(inputClickMock).toHaveBeenCalledTimes(1);
  });

  test('handles file selection, reads file, and calls importMetrics on success', async () => {
    render(<CsvImportButton source="WYZE" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const mockCsvContent = 
`date,weight,bodyFatPct,muscleMassKg
2024-07-30,80,15,65
2024-07-31,79.5,14.8,64.8`
    const file = new File([mockCsvContent], 'wyze_data.csv', { type: 'text/csv' });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check that FileReader was instantiated and readAsText called
    expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
    // Expect readAsText to be called with the file and UNDEFINED encoding (default)
    expect(mockReadAsText).toHaveBeenCalledWith(file, undefined);

    // Ensure the component assigned an onload handler
    expect(capturedOnload).toBeInstanceOf(Function);

    // Simulate FileReader onload event by calling the captured handler
    if (capturedOnload) {
        await act(async () => {
            const mockEvent = { 
                target: { result: mockCsvContent } 
            } as unknown as ProgressEvent<FileReader>; 
            capturedOnload!(mockEvent); // Use non-null assertion
            await Promise.resolve(); 
        });
    } else {
        throw new Error("FileReader onload handler was not captured");
    }

    // Check that importMetrics was called with parsed data
    const expectedMetrics: BodyMetrics[] = [
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        weightKg: 80,
        bodyFatPct: 15,
        muscleMassKg: 65,
        source: 'WYZE',
      },
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        weightKg: 79.5,
        bodyFatPct: 14.8,
        muscleMassKg: 64.8,
        source: 'WYZE',
      },
    ];
    expect(mockImportMetricsFn).toHaveBeenCalledTimes(1);
    expect(mockImportMetricsFn).toHaveBeenCalledWith(expect.arrayContaining(expectedMetrics.map(m => expect.objectContaining(m))));

    // Check success toast
    expect(toast.success).toHaveBeenCalledWith("Import Complete", expect.objectContaining({ description: expect.stringContaining('2 metrics added') }));
    expect(toast.error).not.toHaveBeenCalled();

    // Check button state reset
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });

  test('shows error toast if file reading fails', async () => {
    render(<CsvImportButton source="WYZE" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
    expect(mockReadAsText).toHaveBeenCalledTimes(1);
    expect(capturedOnerror).toBeInstanceOf(Function);

    // Simulate FileReader onerror event
    if (capturedOnerror) {
        await act(async () => {
            const mockEvent = {} as ProgressEvent<FileReader>; 
            capturedOnerror!(mockEvent); // Use non-null assertion
            await Promise.resolve();
        });
    } else {
        throw new Error("FileReader onerror handler was not captured");
    }

    expect(mockImportMetricsFn).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Import Error", { description: "Failed to read file." });
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });
  
   test('shows error toast for invalid CSV header', async () => {
      render(<CsvImportButton source="WYZE" />);
      const fileInput = screen.getByTestId('csv-file-input');
      const mockCsvContent = 
`datum,gewicht
2024-07-30,80`
      const file = new File([mockCsvContent], 'bad_header.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
      expect(capturedOnload).toBeInstanceOf(Function);

      if (capturedOnload) {
          await act(async () => {
              const mockEvent = { target: { result: mockCsvContent } } as unknown as ProgressEvent<FileReader>;
              capturedOnload!(mockEvent); // Use non-null assertion
          });
      } else {
           throw new Error("FileReader onload handler was not captured");
      }

      expect(mockImportMetricsFn).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Import Error", { description: "CSV header missing required columns: 'date', 'weight'." });
      expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });

  test('shows warning toast if no valid rows found', async () => {
      render(<CsvImportButton source="WYZE" />);
      const fileInput = screen.getByTestId('csv-file-input');
      const mockCsvContent = 
`date,weight,bodyFatPct
invalid-date,80,15
2024-07-31,not-a-number,14`
      const file = new File([mockCsvContent], 'no_valid_rows.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });
      
      expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
      expect(capturedOnload).toBeInstanceOf(Function);

       if (capturedOnload) {
          await act(async () => {
              const mockEvent = { target: { result: mockCsvContent } } as unknown as ProgressEvent<FileReader>;
              capturedOnload!(mockEvent); // Use non-null assertion
          });
       } else {
           throw new Error("FileReader onload handler was not captured");
       }

      expect(mockImportMetricsFn).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith("Import Finished", { description: "No valid metrics found to import. 2 rows skipped due to errors." });
      expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });

  test('shows importing state on button while processing', async () => {
      render(<CsvImportButton source="WYZE" />);
      const fileInput = screen.getByTestId('csv-file-input');
      const file = new File(['date,weight\n2024-01-01,80'], 'test.csv', { type: 'text/csv' });

      // Start the process - use act because state updates immediately
       await act(async () => {
         fireEvent.change(fileInput, { target: { files: [file] } });
       });
       
      // Button should be disabled *after* the initial state update in act
      expect(screen.getByRole('button', { name: /Importing.../i })).toBeDisabled();
       
       // Simulate completion
       if (capturedOnload) {
           await act(async () => {
               const mockEvent = { target: { result: 'date,weight\n2024-01-01,80' } } as unknown as ProgressEvent<FileReader>;
               capturedOnload!(mockEvent); // Use non-null assertion
               await Promise.resolve(); 
           });
       } else {
            throw new Error("FileReader onload handler was not captured");
       }

       // Expect button to be enabled again
       expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });
  
  test('handles CSV with missing optional columns (bodyFatPct, muscleMassKg)', async () => {
    render(<CsvImportButton source="FITBIT" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const mockCsvContent = 
`date,weight
2024-07-30,80
2024-07-31,79.5`
    const file = new File([mockCsvContent], 'fitbit_data.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
    expect(capturedOnload).toBeInstanceOf(Function);

     if (capturedOnload) {
        await act(async () => {
            const mockEvent = { target: { result: mockCsvContent } } as unknown as ProgressEvent<FileReader>;
            capturedOnload!(mockEvent); // Use non-null assertion
            await Promise.resolve();
        });
    } else {
         throw new Error("FileReader onload handler was not captured");
    }

    const expectedMetrics: Partial<BodyMetrics>[] = [
      { weightKg: 80, source: 'FITBIT' },
      { weightKg: 79.5, source: 'FITBIT' },
    ];
    expect(mockImportMetricsFn).toHaveBeenCalledTimes(1);
    expect(mockImportMetricsFn).toHaveBeenCalledWith(expect.arrayContaining(expectedMetrics.map(m => expect.objectContaining(m))));
    expect(toast.success).toHaveBeenCalledWith("Import Complete", expect.objectContaining({ description: expect.stringContaining('2 metrics added')}));
    expect(screen.getByRole('button', { name: /Import FITBIT CSV/i })).not.toBeDisabled();
  });

}); 