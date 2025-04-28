'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import dayjs from 'dayjs';

export const TodayWorkout = () => {
  const { workouts, isHydrated } = useAppStore((state) => ({
    workouts: state.workouts,
    isHydrated: state.isHydrated,
  }));

  // TODO: Implement logic to find today's planned workout(s)
  const today = dayjs().format('YYYY-MM-DD');
  const todaysWorkouts = workouts.filter(w => dayjs(w.plannedAt).isSame(today, 'day'));

  if (!isHydrated) {
    return (
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200 min-h-[100px]">
        <p className="text-center text-gray-500">Loading today's plan...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200 min-h-[100px]">
      {todaysWorkouts.length > 0 ? (
        todaysWorkouts.map(workout => (
          <div key={workout.id}>
            <h4 className="font-semibold">{workout.type}</h4>
            <p>Duration: {workout.durationMin} min</p>
            <p>Status: {workout.completed ? 'Completed' : 'Pending'}</p>
            {/* TODO: Add button to mark as complete/view details */}
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500">No workouts planned for today. Rest day!</p>
      )}
      {/* Placeholder content - replace with actual workout display */}
    </div>
  );
}; 