'use client';

import React, { useState } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import type { Workout } from '@/types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

// Placeholder for a single workout item display
const WorkoutItem = ({ workout }: { workout: Workout }) => {
  return (
    <div className="text-xs bg-blue-100 border border-blue-300 p-1 rounded mt-1 cursor-pointer hover:bg-blue-200">
      <span className="font-semibold">{workout.type}</span> ({workout.durationMin}m)
      {workout.completedAt && <span className="text-green-600 ml-1">(Done)</span>}
      {/* TODO: onClick to open WorkoutModal */} 
    </div>
  );
};

// Props for the WeeklyCalendarView
interface WeeklyCalendarViewProps {
  // Add props for week selection later (e.g., startDate)
}

export default function WeeklyCalendarView({}: WeeklyCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('week'));
  // Fetch all workouts (could be optimized later if needed)
  const allWorkouts = usePlannerStore((state) => state.workouts);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    return currentWeekStart.add(i, 'day');
  });

  const getWorkoutsForDay = (day: dayjs.Dayjs) => {
    const dayStr = day.format('YYYY-MM-DD');
    return allWorkouts.filter(w => w.plannedAt.startsWith(dayStr))
                      .sort((a,b) => dayjs(a.plannedAt).diff(dayjs(b.plannedAt))); // Sort by time
  };

  // --- Navigation Functions --- 
  const goToPreviousWeek = () => {
    setCurrentWeekStart(currentWeekStart.subtract(1, 'week'));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(currentWeekStart.add(1, 'week'));
  };

  const goToCurrentWeek = () => {
     setCurrentWeekStart(dayjs().startOf('week'));
  }

  return (
    <div className="bg-white p-4 shadow rounded">
      {/* Week Navigation Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={goToPreviousWeek} className="px-3 py-1 border rounded hover:bg-gray-100">‹ Prev</button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">
             Week of {currentWeekStart.format('MMMM D, YYYY')}
          </h2>
          <button onClick={goToCurrentWeek} className="text-xs text-blue-600 hover:underline">Go to Today</button>
        </div>
        <button onClick={goToNextWeek} className="px-3 py-1 border rounded hover:bg-gray-100">Next ›</button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 border-t border-l border-gray-200">
        {daysOfWeek.map((day) => (
          <div key={day.format('YYYY-MM-DD')} className="border-r border-b border-gray-200 p-2 min-h-[100px]">
            <div className="text-sm font-medium text-center mb-1">
              {day.format('ddd')}{/* Day name */}
              <span className={`ml-1 text-xs ${day.isSame(dayjs(), 'day') ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                {day.format('D')} {/* Date number */}
              </span>
            </div>
            {/* Workouts for this day */}
            <div className="space-y-1">
              {getWorkoutsForDay(day).map(workout => (
                 <WorkoutItem key={workout.id} workout={workout} />
              ))}
               {/* TODO: Add placeholder for dropping new workouts */} 
            </div>
          </div>
        ))}
      </div>

       {/* TODO: Add button to manually add workout */} 
       {/* TODO: Add dnd-kit context */} 
    </div>
  );
} 