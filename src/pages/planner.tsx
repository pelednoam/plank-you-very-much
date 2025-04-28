'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Workout } from '@/lib/types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import { generateWeeklyPlan } from '@/lib/plannerUtils'; // To be created
import { WorkoutModal } from '@/components/WorkoutModal'; // Import the modal

dayjs.extend(isBetween);
dayjs.extend(weekday);

// Simple Workout Card component with Edit functionality
const WorkoutCard = ({ workout, onEdit }: { workout: Workout; onEdit: (workout: Workout) => void }) => (
  // Added cursor-pointer and hover effect for editing
  <div
    key={workout.id}
    className="p-2 mb-2 bg-blue-100 border border-blue-300 rounded text-sm cursor-pointer hover:bg-blue-200 transition-colors"
    onClick={() => onEdit(workout)} // Trigger edit on click
  >
    <p className="font-semibold">{workout.type}</p>
    <p>{workout.durationMin} min</p>
    <p className={workout.completed ? 'text-green-600' : 'text-orange-600'}>
      {workout.completed ? 'Completed' : 'Pending'}
    </p>
    {/* TODO: Add button/indicator for completion */}
  </div>
);

const PlannerPage = () => {
  const { workouts, addWorkout, isHydrated } = useAppStore((state) => ({
    workouts: state.workouts,
    addWorkout: state.addWorkout,
    isHydrated: state.isHydrated,
  }));

  // State for the currently displayed week (start date)
  const [weekStartDate, setWeekStartDate] = useState(dayjs().startOf('week'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>(undefined);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => weekStartDate.add(i, 'day'));

  const workoutsByDay = React.useMemo(() => {
    const weekEnd = weekStartDate.endOf('week');
    const weekWorkouts = workouts.filter(w => dayjs(w.plannedAt).isBetween(weekStartDate, weekEnd, 'day', '[]')); // inclusive

    const grouped: { [key: string]: Workout[] } = {};
    daysOfWeek.forEach(day => {
      grouped[day.format('YYYY-MM-DD')] = [];
    });

    weekWorkouts.forEach(workout => {
      const dayKey = dayjs(workout.plannedAt).format('YYYY-MM-DD');
      if (grouped[dayKey]) {
        grouped[dayKey].push(workout);
      }
    });
    return grouped;
  }, [workouts, weekStartDate, daysOfWeek]);

  const handleGeneratePlan = async () => {
    console.log('Generating plan for week starting:', weekStartDate.format('YYYY-MM-DD'));
    // TODO: Fetch user profile/goals to pass to generator
    const newPlan = generateWeeklyPlan(weekStartDate);
    console.log('Generated Plan:', newPlan);

    // TODO: Clear existing workouts for the week before adding new ones?
    // Or merge/update?

    // Add generated workouts to the store (and IDB)
    for (const workout of newPlan) {
      await addWorkout(workout);
    }
    alert('New weekly plan generated!');
  };

  const goToPreviousWeek = () => setWeekStartDate(prev => prev.subtract(1, 'week'));
  const goToNextWeek = () => setWeekStartDate(prev => prev.add(1, 'week'));
  const goToCurrentWeek = () => setWeekStartDate(dayjs().startOf('week'));

  // Modal handlers
  const openAddModal = (date?: string) => {
    setWorkoutToEdit(null);
    setSelectedDateForNew(date);
    setIsModalOpen(true);
  };

  const openEditModal = (workout: Workout) => {
    setWorkoutToEdit(workout);
    setSelectedDateForNew(undefined);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setWorkoutToEdit(null); // Clear editing state when closing
    setSelectedDateForNew(undefined);
  };

  if (!isHydrated) {
    return <div className="p-4">Loading planner...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Weekly Planner</h1>

      {/* Week Navigation & Add Button */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={goToPreviousWeek} className="px-3 py-1 border rounded hover:bg-gray-100">{'<'}</button>
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            Week of {weekStartDate.format('MMM D, YYYY')}
          </h2>
          <button onClick={goToCurrentWeek} className="text-sm text-blue-600 hover:underline">Go to Today</button>
        </div>
        <button onClick={goToNextWeek} className="px-3 py-1 border rounded hover:bg-gray-100">{'>'}</button>
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex justify-center items-center gap-4">
        <button
          onClick={() => openAddModal()} // Open modal without specific date
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Workout
        </button>
        <button
          onClick={handleGeneratePlan}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Generate Plan for this Week
        </button>
      </div>
       <p className="text-center text-xs text-gray-500 mb-4">(Plan generation is a placeholder)</p>

      {/* Calendar Grid */}
      {/* TODO: Implement Drag and Drop Context (@dnd-kit/core) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-px border border-gray-200 bg-gray-200">
        {/* Headers */}
        {daysOfWeek.map((day) => (
          <div key={day.format()} className="text-center font-semibold p-2 border-b border-gray-200 bg-gray-100">
            {day.format('ddd')} <span className="block text-xs font-normal text-gray-500">{day.format('M/D')}</span>
          </div>
        ))}

        {/* Calendar Cells */}
        {daysOfWeek.map((day) => {
          const dayKey = day.format('YYYY-MM-DD');
          const dailyWorkouts = workoutsByDay[dayKey] || [];
          return (
            // Added relative positioning for potential absolute elements like an add button
            <div key={dayKey} className="p-2 border-gray-200 min-h-[150px] bg-white relative">
              {/* TODO: Implement Droppable Area (@dnd-kit/sortable?) */}
              {dailyWorkouts.length > 0 ? (
                dailyWorkouts.map(workout => (
                  // TODO: Wrap in Draggable Item
                  <WorkoutCard key={workout.id} workout={workout} onEdit={openEditModal} />
                ))
              ) : (
                <div className="text-center text-xs text-gray-400 pt-4">No activities</div>
              )}
              {/* Add button per day - optional */}
               <button
                 onClick={() => openAddModal(dayKey)} // Open modal with this specific date
                 className="absolute bottom-1 right-1 text-xs text-gray-400 hover:text-blue-600 p-1 rounded"
                 title="Add workout to this day"
               >
                 + Add
               </button>
            </div>
          );
        })}
      </div>

      {/* Render the Modal */}
      <WorkoutModal
        isOpen={isModalOpen}
        onClose={closeModal}
        workoutToEdit={workoutToEdit}
        selectedDate={selectedDateForNew}
      />

    </div>
  );
};

export default PlannerPage; 