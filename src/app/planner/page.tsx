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
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
dayjs.extend(isoWeek);

// Placeholder component for the calendar view
const CalendarView = () => {
    // TODO: Implement calendar using a library like react-big-calendar or build custom
    return (
        <div className="p-4 border rounded bg-white shadow min-h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Calendar View Placeholder</p>
            {/* Will display workouts fetched from useWorkoutStore on a calendar grid */}
        </div>
    );
};

// Placeholder component for workout details/modal (if needed directly on this page)
const WorkoutDetails = () => {
    // TODO: Implement modal or panel to show workout details when clicked on calendar
    return null; // Or a placeholder div if preferred
};

export default function PlannerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  
  // Correctly select workouts for the current week
  const currentMonday = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
  const currentWeekPlan = usePlannerStore((state) => state.plans[currentMonday]);
  const workoutsForCurrentWeek = currentWeekPlan?.workouts ?? []; // Get workouts or default to empty array

  // Get the correct action for updating workout data
  const updateWorkoutInPlan = usePlannerStore((state) => state._updateWorkoutInPlan); 
  const [showQrScanner, setShowQrScanner] = useState(false);
  const isOnline = useOnlineStatus();

  // Function to handle logging workout start (either online or queueing)
  const handleWorkoutStart = (workoutId: string) => {
    const startTime = dayjs().toISOString();
    const updateData = { startedAt: startTime };
    
    console.log(`Attempting to log start for workout ${workoutId} at ${startTime}`);
    // Use the correct action to update the workout state
    updateWorkoutInPlan(workoutId, updateData); 

    // TODO: Add offline queueing logic here if needed, similar to markWorkoutComplete
    // For now, just update local state optimistically.
    toast.success("Workout Started!", { description: `Logged start time for workout ID: ${workoutId.substring(0, 8)}...` });
  };

  const handleWorkoutScan = async (workoutId: string) => {
    if (!workoutId) return;
    // Log start using the dedicated handler
    handleWorkoutStart(workoutId);
    // Find workout to potentially open modal (still useful)
    const workout = workoutsForCurrentWeek.find(w => w.id === workoutId);
    if (workout) {
      setSelectedWorkout(workout);
      setIsModalOpen(true);
    } else {
      toast.warning("Workout Started (Not Found)", { description: `Logged start for ID ${workoutId}, but details not found in current view.` });
    }
  };

  const handleNfcScan = async (workoutId: string) => {
    if (!workoutId) return;
    stopScan(); // Stop scanning after successful read
    
    // Log start using the dedicated handler
    handleWorkoutStart(workoutId);

    // Find workout details from the CORRECT workouts array to show modal
    const workout = workoutsForCurrentWeek.find(w => w.id === workoutId);
    if (workout) {
        setSelectedWorkout(workout);
        setIsModalOpen(true);
    } else {
        toast.warning("Workout Started (Not Found)", { description: `Logged start for ID ${workoutId} from NFC, but details not found in current view.` });
    }
  };

  // Correctly use the hook
  const { isScanning, nfcSupported, startScan, stopScan } = useNfcReader({ 
    onScanSuccess: handleNfcScan // Pass callback in options object
  });
  
  const handleCloseModal = () => setIsModalOpen(false);

  // TODO: Fetch or initialize plan on load?
  // useEffect(() => { initializePlannerStore(); }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Workout Planner</h1>

      {/* Weekly Calendar View Placeholder - Replace with actual implementation */}
       <div className="border rounded-lg p-4 bg-gray-50">
           <h2 className="font-medium mb-2">Week of {currentMonday}</h2>
           <p className="text-sm text-gray-600">Calendar view coming soon...</p>
           {/* Display fetched workouts */}
           <ul className="mt-2 space-y-1">
                {workoutsForCurrentWeek.length > 0 ? (
                    workoutsForCurrentWeek.map(wo => (
                        <li key={wo.id} className="text-xs p-1 bg-blue-100 rounded">
                            {dayjs(wo.plannedAt).format('ddd')}: {wo.type} ({wo.durationMin} min)
                        </li>
                     )))
                 : (
                    <li>No workouts planned for this week yet.</li>
                 )
                 }
           </ul>
       </div>

      <div className="flex gap-2">
         {nfcSupported && (
            <Button onClick={startScan} disabled={isScanning} variant="outline">
                {isScanning ? 'Scanning NFC...' : 'Scan NFC for Workout'}
            </Button>
         )}
        <Button onClick={() => setShowQrScanner(true)} variant="outline">
          Scan QR Code
        </Button>
      </div>

      {showQrScanner && (
        <Dialog open={showQrScanner} onOpenChange={setShowQrScanner}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan Workout QR Code</DialogTitle>
            </DialogHeader>
             <QrReader
                onResult={(result, error) => {
                  if (!!result) {
                    setShowQrScanner(false);
                    handleWorkoutScan(result?.getText());
                  }

                  if (!!error) {
                    console.info(error); // Log scan errors but don't bother user?
                  }
                }}
                constraints={{ facingMode: 'environment' }} 
                // @ts-ignore - react-qr-reader types might be slightly off
                style={{ width: '100%' }}
             />
          </DialogContent>
        </Dialog>
      )}

      {/* Workout Details Modal - Placeholder */}
       {selectedWorkout && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                 <h2 className="text-lg font-semibold mb-3">Workout Details: {selectedWorkout.type}</h2>
                 <p className="text-sm mb-1">Date: {dayjs(selectedWorkout.plannedAt).format('ddd, MMM D')}</p>
                 <p className="text-sm mb-1">Duration: {selectedWorkout.durationMin} minutes</p>
                 {selectedWorkout.notes && <p className="text-sm mt-2 pt-2 border-t">Notes: {selectedWorkout.notes}</p>}
                 <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCloseModal}>Close</Button>
                    <Button onClick={() => handleWorkoutStart(selectedWorkout.id)}>Log Start</Button>
                 </div>
             </div>
            </div>
       )}

    </div>
  );
} 