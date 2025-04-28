'use client';

import React from 'react';
import WeeklyCalendarView from '@/features/planner/components/WeeklyCalendarView';

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weekly Planner</h1>

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