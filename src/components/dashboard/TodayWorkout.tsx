'use client'; // Needed for hook

import React from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import dayjs from 'dayjs';
import { Workout } from '@/types';

// Helper component to display a single workout card
const WorkoutCard = ({ workout }: { workout: Workout }) => {
  return (
    <div key={workout.id} className="mb-2 p-2 border rounded border-gray-200">
        <h3 className="font-semibold text-sm">{workout.type}</h3>
        <p className="text-xs">Duration: {workout.durationMin} min</p>
        <p className="text-xs">Time: {dayjs(workout.plannedAt).format('h:mm A')}</p>
        <p className={`text-xs font-medium ${workout.completedAt ? 'text-green-600' : 'text-orange-600'}`}>
            Status: {workout.completedAt ? `Completed ${dayjs(workout.completedAt).format('h:mm A')}` : 'Pending'}
        </p>
        {/* TODO: Add button to toggle complete / view workout details */}
    </div>
  );
};

export default function TodayWorkout() {
  // Get today's date in YYYY-MM-DD format
  const todayStr = dayjs().format('YYYY-MM-DD');
  // Get workouts for today from the store
  const todaysWorkouts = usePlannerStore((state) => state.getWorkoutsForDate(todayStr));

  return (
    <div className="bg-white p-4 shadow rounded">
      {todaysWorkouts.length > 0 ? (
        todaysWorkouts.map(workout => <WorkoutCard key={workout.id} workout={workout} />)
      ) : (
        <p className="text-gray-500">No workouts planned for today. Enjoy your rest!</p>
      )}
    </div>
  );
} 