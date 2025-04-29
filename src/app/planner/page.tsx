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
  const workouts = usePlannerStore((state) => state.workouts);
  const logWorkoutStart = usePlannerStore((state) => state.logWorkoutStart);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const isOnline = useOnlineStatus();

  const handleWorkoutScan = async (workoutId: string) => {
    console.log(`Planner Page: Received workout ID ${workoutId} from scan.`);
    setShowQrScanner(false);
    stopNfcScan();
    
    const workout = workouts.find(w => w.id === workoutId);

    if (workout) {
        try {
            await logWorkoutStart(workout.id, isOnline);
             toast.info("Workout Started", { description: `Started ${workout.type} session.` });
        } catch (error) {
             console.error("Failed to log workout start:", error);
             toast.error("Error Starting Workout", { description: "Could not mark workout as started." });
        }
        setSelectedWorkout(workout);
        setIsModalOpen(true);
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
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Workout Planner</h1>

      {/* Add controls for date navigation if needed */}
      {/* <div className="flex justify-between items-center">...</div> */}

      <CalendarView />

      <WorkoutDetails />

      {/* TODO: Add button or logic for plan generation (Spec 8.4) */}
    </div>
  );
} 