"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Corrected NDEF Event structure (based on common Web NFC usage)
// The event object itself usually contains the serialNumber and records
interface NdefReadingEvent {
    serialNumber?: string;
    message: { // The message property contains the records
        records: Array<{ 
            data?: ArrayBuffer, 
            recordType?: string, 
            mediaType?: string, 
            encoding?: string 
            // other potential NDEF record fields...
        }>;
    };
}

export function useNfcReader() {
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    useEffect(() => {
        // Check for Web NFC support on mount
        if ('NDEFReader' in window) {
            setNfcSupported(true);
        } else {
            setNfcSupported(false);
            console.warn('Web NFC API is not supported on this browser.');
        }
        // Cleanup function to abort scan if component unmounts while scanning
        return () => {
            abortController?.abort();
        };
    }, [abortController]);

    const startScan = useCallback(async () => {
        if (!nfcSupported) {
            toast.error("NFC Not Supported", { description: "Web NFC is not available on this browser." });
            return;
        }
        if (isScanning) {
             console.log("Scan already in progress.");
             return;
        }

        setIsScanning(true);
        setScanError(null);
        const controller = new AbortController();
        setAbortController(controller);

        try {
            console.log("Starting NFC scan...");
            const ndef = new (window as any).NDEFReader();
            
            await ndef.scan({ signal: controller.signal });
            console.log("NFC Scan active. Waiting for tag...");
            toast.info("NFC Scan Active", { description: "Hold your device near an NFC tag." });

            ndef.onreadingerror = (event: any) => {
                console.error("NFC reading error:", event);
                setScanError("Error reading NFC tag.");
                toast.error("NFC Read Error", { description: "Could not read data from the tag." });
                // Keep scanning? Or stop? For now, let it keep trying unless aborted.
            };

            ndef.onreading = (event: NdefReadingEvent) => {
                console.log("NFC Tag read:", event);
                setScanError(null);
                setIsScanning(false);
                setAbortController(null);
                controller.abort();

                if (!event.message || !event.message.records || event.message.records.length === 0) {
                    console.warn("NFC read: No message or records found.");
                     toast.warning("NFC Tag Empty", { description: "The tag does not contain readable data." });
                    return;
                }
                
                const record = event.message.records[0];
                
                if (!record.data) {
                     console.warn("NFC read: Record contains no data.");
                     toast.warning("NFC Tag Invalid", { description: "Tag record contains no data." });
                     return;
                }

                if (record.recordType === 'url' || record.mediaType === 'text/plain') {
                    try {
                        const textDecoder = new TextDecoder(record.encoding || "utf-8");
                        const url = textDecoder.decode(record.data);
                        console.log("Decoded NFC URL:", url);

                        if (url.startsWith('plankyou://workout/')) {
                            const workoutId = url.substring('plankyou://workout/'.length);
                            toast.success("Workout Tag Scanned!", { description: `Workout ID: ${workoutId}` });
                            console.log(`Action: Start workout ${workoutId}`);
                        } else {
                            console.warn("NFC read: URL doesn't match expected format.", url);
                            toast.warning("Unknown NFC Tag", { description: "This tag isn't recognized by the app." });
                        }
                    } catch (e) {
                         console.error("NFC URL decoding error:", e);
                         toast.error("NFC Read Error", { description: "Failed to decode tag data." });
                    }
                } else {
                    console.warn("NFC read: Record type is not URL or plain text.", record.recordType, record.mediaType);
                     toast.warning("Unsupported NFC Tag", { description: `Tag type (${record.recordType}) not supported.` });
                }
            };

        } catch (error: any) {
            console.error("NFC scan initiation failed:", error);
            if (error.name === 'AbortError') {
                console.log("NFC scan aborted.");
                 toast.info("NFC Scan Cancelled");
            } else if (error.name === 'NotAllowedError') {
                 setScanError("NFC permission denied.");
                 toast.error("NFC Permission Denied", { description: "Please allow NFC access in browser settings." });
            } else {
                setScanError("Failed to start NFC scan.");
                toast.error("NFC Error", { description: "Could not start scanning. Is NFC enabled?" });
            }
            setIsScanning(false);
            setAbortController(null);
        }
    }, [nfcSupported, isScanning, router]);

    const stopScan = useCallback(() => {
        if (abortController) {
            console.log("Manually stopping NFC scan...");
            abortController.abort();
            setAbortController(null);
            setIsScanning(false);
        }
    }, [abortController]);

    return { isScanning, nfcSupported, scanError, startScan, stopScan };
} 