'use client';

import React from 'react';
import WeeklyCalendarView from '@/features/planner/components/WeeklyCalendarView';
import { useNfcReader } from '@/hooks/useNfcReader';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';

export default function PlannerPage() {
  const { isScanning, nfcSupported, startScan, stopScan } = useNfcReader();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weekly Planner</h1>
        {nfcSupported && (
             <div className="flex space-x-2">
                 {!isScanning ? (
                     <Button 
                         onClick={startScan} 
                         disabled={isScanning}
                         variant="outline"
                         size="sm"
                     >
                         <ScanLine className="mr-2 h-4 w-4" />
                         Scan Workout Tag
                     </Button>
                ) : (
                     <Button 
                         onClick={stopScan} 
                         variant="destructive"
                         size="sm"
                     >
                         Cancel Scan
                     </Button>
                )}
            </div>
        )}
      </div>

      {/* Calendar View */} 
      <WeeklyCalendarView />

      {/* Placeholder for WorkoutModal (to be implemented) */} 
      {/* <WorkoutModal /> */}

      {/* Instructions/Notes */}
      <p className="text-sm text-gray-600">
         Drag and drop workouts to reschedule (coming soon).
         Click a workout to view details or mark complete (coming soon).
      </p>

      {/* TODO: Integrate dnd-kit for drag & drop */}
    </div>
  );
} 