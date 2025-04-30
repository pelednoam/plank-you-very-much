import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CsvImportButton } from './CsvImportButton';
import { useMetricsStore } from '@/store/metricsStore';
import { toast } from 'sonner';
import type { BodyMetrics } from '@/types';

// --- Mock Store --- 
// Keep track of the mock function outside the mock definition
const mockImportMetricsFn = jest.fn(() => ({ added: 0, duplicates: 0 }));

jest.mock('@/store/metricsStore', () => ({
  useMetricsStore: jest.fn(() => ({
    importMetrics: mockImportMetricsFn, // Use the tracked mock function
  })),
}));
// --- End Mock Store --- 

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  onload: jest.fn() as jest.Mock<void, [ProgressEvent<FileReader>]>,
  onerror: jest.fn() as jest.Mock<void, [ProgressEvent<FileReader>]>,
  result: '' as string | ArrayBuffer | null
};

const mockFileReaderConstructor = jest.fn(() => mockFileReader);

beforeAll(() => {
  // Assign the mock constructor to the global FileReader
  Object.defineProperty(window, 'FileReader', {
    writable: true,
    value: mockFileReaderConstructor,
  });
});

beforeEach(() => {
  // Reset mocks before each test
  // Reset the store mock function's implementation/calls
  mockImportMetricsFn.mockClear().mockImplementation(() => ({ added: 0, duplicates: 0 }));
  // Reset other mocks (toast, FileReader)
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  (toast.warning as jest.Mock).mockClear();
  mockFileReader.readAsText.mockClear();
  mockFileReader.onload.mockClear();
  mockFileReader.onerror.mockClear();
  mockFileReader.result = '';
  mockFileReaderConstructor.mockClear();
});

describe('CsvImportButton', () => {

  beforeEach(() => {
      // Reset the specific mock function for importMetrics before each test in this suite
      mockImportMetricsFn.mockClear().mockImplementation(() => ({ added: 2, duplicates: 1 }));
  });

  test('renders button with correct text and icon', () => {
    render(<CsvImportButton source="WYZE" />);
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).toBeInTheDocument();
  });
  
  // Add data-testid to the Input component in CsvImportButton.tsx for this test
  test('clicking button triggers hidden file input', () => {
      render(<CsvImportButton source="WYZE" />);
      const button = screen.getByRole('button');
      // Assuming the Input has data-testid="csv-file-input"
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

    // Check that FileReader was used
    expect(mockFileReaderConstructor).toHaveBeenCalledTimes(1);
    expect(mockFileReader.readAsText).toHaveBeenCalledWith(file, undefined);

    // Simulate FileReader onload event
    mockFileReader.result = mockCsvContent;
    // We need to wrap the onload call in act because it triggers state updates (isImporting)
    await act(async () => {
         // Directly call the assigned onload function with a mock event
        const mockEvent = { target: { result: mockCsvContent } } as ProgressEvent<FileReader>;
        mockFileReader.onload(mockEvent);
         // Allow promises to resolve (e.g., importMetrics potentially being async)
         await Promise.resolve(); 
    });

    // Check that importMetrics was called with parsed data
    const expectedMetrics: BodyMetrics[] = [
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), // ISO format check
        weightKg: 80,
        bodyFatPct: 15,
        muscleMassKg: 65,
        source: 'WYZE',
      },
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), // ISO format check
        weightKg: 79.5,
        bodyFatPct: 14.8,
        muscleMassKg: 64.8,
        source: 'WYZE',
      },
    ];
    expect(mockImportMetricsFn).toHaveBeenCalledTimes(1);
    expect(mockImportMetricsFn).toHaveBeenCalledWith(expect.arrayContaining(expectedMetrics.map(m => expect.objectContaining(m))));

    // Check success toast
    expect(toast.success).toHaveBeenCalledWith("Import Complete", expect.any(Object));
    expect(toast.error).not.toHaveBeenCalled();

    // Check button state reset
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });

  test('shows error toast if file reading fails', async () => {
    render(<CsvImportButton source="WYZE" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Simulate FileReader onerror event
    await act(async () => {
        const mockEvent = { } as ProgressEvent<FileReader>; // Event content might not matter here
        mockFileReader.onerror(mockEvent);
    });

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

      await act(async () => {
          const mockEvent = { target: { result: mockCsvContent } } as ProgressEvent<FileReader>;
          mockFileReader.onload(mockEvent);
      });

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

      await act(async () => {
          const mockEvent = { target: { result: mockCsvContent } } as ProgressEvent<FileReader>;
          mockFileReader.onload(mockEvent);
      });

      expect(mockImportMetricsFn).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith("Import Finished", { description: "No valid metrics found to import. 2 rows skipped due to errors." });
      expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).not.toBeDisabled();
  });

  test('shows importing state on button while processing', () => {
    render(<CsvImportButton source="WYZE" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const file = new File(['date,weight\n2024-01-01,80'], 'test.csv', { type: 'text/csv' });

    // Initial state
    expect(screen.getByRole('button', { name: /Import WYZE CSV/i })).toBeInTheDocument();

    // Trigger file change - should set isImporting
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Check button text/state WHILE importing (before onload fires)
    expect(screen.getByRole('button', { name: /Importing.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importing.../i })).toBeDisabled();

    // (Simulating onload happens in other tests which also check the final state)
  });

  // Add test for missing optional columns (fat%, muscle%)
  test('handles CSV with missing optional columns (bodyFatPct, muscleMassKg)', async () => {
    render(<CsvImportButton source="WYZE" />);
    const fileInput = screen.getByTestId('csv-file-input');
    const mockCsvContent = 
`date,weight
2024-07-30,80
2024-07-31,79.5`
    const file = new File([mockCsvContent], 'wyze_basic.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await act(async () => {
        const mockEvent = { target: { result: mockCsvContent } } as ProgressEvent<FileReader>;
        mockFileReader.onload(mockEvent);
    });

    const expectedMetrics: BodyMetrics[] = [
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        weightKg: 80,
        bodyFatPct: undefined,
        muscleMassKg: undefined,
        source: 'WYZE',
      },
      {
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        weightKg: 79.5,
        bodyFatPct: undefined,
        muscleMassKg: undefined,
        source: 'WYZE',
      },
    ];
    expect(mockImportMetricsFn).toHaveBeenCalledWith(expect.arrayContaining(expectedMetrics.map(m => expect.objectContaining(m))));
    expect(toast.success).toHaveBeenCalled();
  });

}); 