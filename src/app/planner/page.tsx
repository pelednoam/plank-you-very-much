'use client';

import React, { useState } from 'react';
import WeeklyCalendarView from '@/features/planner/components/WeeklyCalendarView';
import { useNfcReader } from '@/hooks/useNfcReader';
import { Button } from '@/components/ui/button';
import { ScanLine, QrCode } from 'lucide-react';
import { WorkoutModal } from '@/features/planner/components/WorkoutModal';
import { usePlannerStore } from '@/store/plannerStore';
import type { Workout } from '@/types';
import { toast } from 'sonner';
import { QrReader } from 'react-qr-reader';

export default function PlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const workouts = usePlannerStore((state) => state.workouts);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const handleWorkoutScan = (workoutId: string) => {
    console.log(`Planner Page: Received workout ID ${workoutId} from scan.`);
    setShowQrScanner(false);
    
    const workout = workouts.find(w => w.id === workoutId);

    if (workout) {
        setSelectedWorkout(workout);
        setIsModalOpen(true);
        stopNfcScan();
    } else {
        toast.error("Workout Not Found", { description: `Workout ID ${workoutId} scanned but not found in your plan.` });
    }
  };

  const { 
      isScanning: isNfcScanning, 
      nfcSupported, 
      startScan: startNfcScan, 
      stopScan: stopNfcScan 
    } = useNfcReader({
      onScanSuccess: handleWorkoutScan,
  });

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedWorkout(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weekly Planner</h1>
        <div className="flex items-center space-x-2">
             {nfcSupported && (
                 <> 
                     {!isNfcScanning ? (
                         <Button 
                             onClick={startNfcScan} 
                             disabled={isNfcScanning || showQrScanner}
                             variant="outline"
                             size="sm"
                         >
                             <ScanLine className="mr-2 h-4 w-4" />
                             Scan NFC Tag
                         </Button>
                    ) : (
                         <Button 
                             onClick={stopNfcScan} 
                             variant="destructive"
                             size="sm"
                         >
                             Cancel NFC Scan
                         </Button>
                    )}
                 </>
             )}
             {!showQrScanner ? (
                 <Button 
                    onClick={() => setShowQrScanner(true)} 
                    disabled={isNfcScanning} 
                    variant="outline" 
                    size="sm"
                 >
                     <QrCode className="mr-2 h-4 w-4" />
                     Scan QR Code
                </Button>
             ) : (
                  <Button 
                    onClick={() => setShowQrScanner(false)} 
                    variant="destructive"
                    size="sm"
                 >
                     Close QR Scanner
                 </Button>
             )}
         </div>
      </div>

       {showQrScanner && (
           <div className="my-4 p-4 border rounded bg-gray-50 max-w-md mx-auto">
                <QrReader
                    onResult={(result, error) => {
                        if (!!result) {
                            const scannedText = result?.getText();
                            console.log("QR Scan Result:", scannedText);
                            if (scannedText && scannedText.startsWith('plankyou://workout/')) {
                                const workoutId = scannedText.substring('plankyou://workout/'.length);
                                handleWorkoutScan(workoutId);
                            } else {
                                toast.warning("Invalid QR Code", { description: "This QR code is not a valid workout code." });
                            }
                        }

                        if (!!error) {
                             if (error.message.includes('not found')) return;
                            console.info("QR Scan Error:", error);
                        }
                    }}
                    constraints={{ facingMode: 'environment' }}
                    containerStyle={{ width: '100%' }}
                />
                 <p className="text-center text-sm text-gray-500 mt-2">Point your camera at a workout QR code.</p>
           </div>
       )}

      {/* Calendar View */} 
      <WeeklyCalendarView />

      {/* Render WorkoutModal */}
      <WorkoutModal
         isOpen={isModalOpen}
         onClose={handleCloseModal}
         workoutToEdit={selectedWorkout}
      />

      {/* Instructions/Notes */}
      <p className="text-sm text-gray-600">
         Drag and drop workouts to reschedule (coming soon).
         Click a workout to view details or mark complete (coming soon).
      </p>

      {/* TODO: Integrate dnd-kit for drag & drop */}
    </div>
  );
} 