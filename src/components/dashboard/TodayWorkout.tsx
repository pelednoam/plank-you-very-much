import React from 'react';

// TODO: Fetch today's planned workout(s) from the planner/store
export default function TodayWorkout() {
  const workout = {
    type: 'CORE',
    durationMin: 20,
    completed: false,
  }; // Placeholder

  return (
    <div className="bg-white p-4 shadow rounded">
      {workout ? (
        <div>
          <h3 className="font-semibold">Today's Workout: {workout.type}</h3>
          <p>Duration: {workout.durationMin} minutes</p>
          <p>Status: {workout.completed ? 'Completed' : 'Pending'}</p>
          {/* TODO: Add button to start/view workout details */} 
        </div>
      ) : (
        <p>No workout planned for today. Rest day!</p>
      )}
    </div>
  );
} 