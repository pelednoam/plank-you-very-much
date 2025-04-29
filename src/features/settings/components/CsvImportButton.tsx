"use client";

import React, { useState, useRef } from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import type { BodyMetrics } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // For the hidden file input
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs'; // For date validation

interface CsvImportButtonProps {
    source: 'WYZE' | 'MANUAL' | 'FITBIT'; // Specify the source for imported metrics
    buttonText?: string;
    className?: string;
}

export const CsvImportButton: React.FC<CsvImportButtonProps> = ({ 
    source,
    buttonText = `Import ${source} CSV`,
    className
}) => {
    const importMetrics = useMetricsStore((state) => state.importMetrics);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                parseAndImportCsv(text);
            } else {
                toast.error("Import Error", { description: "Could not read file content." });
                setIsImporting(false);
            }
        };

        reader.onerror = () => {
            toast.error("Import Error", { description: "Failed to read file." });
            setIsImporting(false);
        };

        reader.readAsText(file);
        // Reset file input value to allow importing the same file again
        event.target.value = '';
    };

    const parseAndImportCsv = (csvText: string) => {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 2) {
            toast.error("Import Error", { description: "CSV file appears empty or has no data rows." });
            setIsImporting(false);
            return;
        }

        // Assume header: date,weight,bodyFatPct,muscleMassKg (flexible order maybe later)
        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim());
        // Basic check for required headers
        if (!headers.includes('date') || !headers.includes('weight')) {
            toast.error("Import Error", { description: "CSV header missing required columns: 'date', 'weight'." });
            setIsImporting(false);
            return;
        }
        const dateIndex = headers.indexOf('date');
        const weightIndex = headers.indexOf('weight');
        const fatIndex = headers.indexOf('bodyfatpct'); // Be flexible with casing/spacing
        const muscleIndex = headers.indexOf('musclemasskg');

        const importedMetrics: BodyMetrics[] = [];
        let errorCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) {
                 console.warn(`Skipping row ${i + 1}: Incorrect number of columns.`);
                 errorCount++;
                 continue;
            }

            const dateStr = values[dateIndex];
            const weightKg = parseFloat(values[weightIndex]);
            const bodyFatPct = fatIndex !== -1 ? parseFloat(values[fatIndex]) : undefined;
            const muscleMassKg = muscleIndex !== -1 ? parseFloat(values[muscleIndex]) : undefined;
            
            // Validation
            if (!dateStr || isNaN(weightKg) || !dayjs(dateStr).isValid()) {
                console.warn(`Skipping row ${i + 1}: Invalid date or weight format.`);
                errorCount++;
                continue;
            }
            if (bodyFatPct !== undefined && isNaN(bodyFatPct)) {
                console.warn(`Skipping row ${i + 1}: Invalid body fat value.`);
                errorCount++;
                continue;
            }
            if (muscleMassKg !== undefined && isNaN(muscleMassKg)) {
                console.warn(`Skipping row ${i + 1}: Invalid muscle mass value.`);
                errorCount++;
                continue;
            }

            importedMetrics.push({
                date: dayjs(dateStr).toISOString(), // Ensure ISO format
                weightKg,
                bodyFatPct: bodyFatPct !== undefined && !isNaN(bodyFatPct) ? bodyFatPct : undefined,
                muscleMassKg: muscleMassKg !== undefined && !isNaN(muscleMassKg) ? muscleMassKg : undefined,
                source: source, // Use the provided source prop
            });
        }
        
        if (importedMetrics.length > 0) {
             const result = importMetrics(importedMetrics);
            toast.success("Import Complete", {
                description: `${result.added} new metrics added. ${result.duplicates} duplicates/older ignored. ${errorCount} rows skipped due to errors.`
            });
        } else {
             toast.warning("Import Finished", { 
                 description: `No valid metrics found to import. ${errorCount} rows skipped due to errors.`
             });
        }
        setIsImporting(false);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            <Input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                style={{ display: 'none' }} // Hide the actual input
                disabled={isImporting}
            />
            <Button 
                onClick={triggerFileInput}
                disabled={isImporting}
                variant="secondary"
                size="sm"
                className={className}
            >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : buttonText}
            </Button>
        </>
    );
}; 