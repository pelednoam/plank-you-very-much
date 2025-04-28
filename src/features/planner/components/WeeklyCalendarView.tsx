'use client';

import React, { useState } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { useUserProfileStore } from '@/store/userProfileStore'; // Import user profile store
import type { Workout } from '@/types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
// Import the modal component
import { WorkoutModal } from './WorkoutModal';
import { Button } from '@/components/ui/Button'; // For Add button
import { PlusCircleIcon } from 'lucide-react';
// Import dnd-kit components
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

dayjs.extend(isBetween);

// --- Draggable Workout Item Component --- 
const WorkoutItem = ({ workout, onClick }: { workout: Workout, onClick: (event: React.MouseEvent) => void }) => {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: workout.id,
    data: { workout }, // Pass workout data for the drag event
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : 'auto', // Ensure dragged item is on top
    opacity: isDragging ? 0.75 : 1,
  } : undefined;

  return (
    <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="text-xs bg-blue-100 border border-blue-300 p-1 rounded mt-1 cursor-grab touch-none active:cursor-grabbing"
        onClick={onClick} // Still allow opening modal on click
        // Prevent day cell click when dragging starts (listeners handle this)
    >
      <span className="font-semibold">{workout.type}</span> ({workout.durationMin}m)
      {/* Use completedAt based on type definition */}
      {workout.completedAt && <span className="text-green-600 ml-1">(✓)</span>}
    </div>
  );
};

// --- Droppable Day Cell Component --- 
interface DayCellProps {
  day: dayjs.Dayjs;
  workouts: Workout[];
  onOpenAddModal: (date: dayjs.Dayjs) => void;
  onOpenEditModal: (workout: Workout) => void;
}

const DayCell = ({ day, workouts, onOpenAddModal, onOpenEditModal }: DayCellProps) => {
  const dayStr = day.format('YYYY-MM-DD');
  const {isOver, setNodeRef} = useDroppable({
    id: dayStr, // Use date string as droppable ID
  });

  const style = {
    backgroundColor: isOver ? '#e0f2fe' : 'white', // Highlight when hovering over
    transition: 'background-color 150ms ease-in-out',
  };

  return (
    <div
      ref={setNodeRef}
      key={dayStr}
      style={style}
      className="border-r border-b border-gray-200 p-2 min-h-[120px] relative"
      onClick={() => onOpenAddModal(day)} // Click empty space in day cell to add
    >
      {/* Day Header - make non-interactive for dnd */}
      <div className="text-sm font-medium text-center mb-1 select-none">
        {day.format('ddd')}
        <span className={`ml-1 text-xs ${day.isSame(dayjs(), 'day') ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
          {day.format('D')}
        </span>
      </div>
      {/* Workouts for this day */}
      <div className="space-y-1">
        {workouts.map(workout => (
            <WorkoutItem
              key={workout.id}
              workout={workout}
              onClick={(e: React.MouseEvent) => { // Explicitly type event
                  e.stopPropagation(); // Prevent day cell click
                  onOpenEditModal(workout);
              }}
            />
        ))}
      </div>
      {/* Add a slightly larger click target at the bottom if needed */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-4" onClick={(e) => { e.stopPropagation(); onOpenAddModal(day); }}></div> */}
    </div>
  );
};

// Props for the WeeklyCalendarView
interface WeeklyCalendarViewProps {
  // Add props for week selection later (e.g., startDate)
}

export default function WeeklyCalendarView({}: WeeklyCalendarViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('week'));
  const { workouts: allWorkouts, updateWorkout, generatePlan, clearPlanForWeek } = usePlannerStore((state) => ({
    workouts: state.workouts,
    updateWorkout: state.updateWorkout,
    generatePlan: state.generatePlan,
    clearPlanForWeek: state.clearPlanForWeek,
  }));
  // Get user profile for plan generation
  const userProfile = useUserProfileStore((state) => state.profile);

  // --- Modal State --- 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>(undefined);

  // --- Modal Handlers --- 
  const handleOpenAddModal = (date: dayjs.Dayjs) => {
      setSelectedDateForNew(date.format('YYYY-MM-DD'));
      setEditingWorkout(null);
      setIsModalOpen(true);
  };

  const handleOpenEditModal = (workout: Workout) => {
      setSelectedDateForNew(undefined);
      setEditingWorkout(workout);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingWorkout(null);
      setSelectedDateForNew(undefined);
  };

  // --- Calendar Logic --- 
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

  // --- Dnd Handlers --- 
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Require small movement before dragging
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeWorkout = allWorkouts.find(w => w.id === active.id);
      const newDateStr = over.id as string; // The droppable ID is the date string YYYY-MM-DD

      if (activeWorkout && dayjs(newDateStr, 'YYYY-MM-DD', true).isValid()) {
        // Keep the original time, change the date
        const originalTime = dayjs(activeWorkout.plannedAt).format('HH:mm:ss');
        const newPlannedAt = dayjs(`${newDateStr}T${originalTime}`).toISOString();

        console.log(`Moving workout ${active.id} to ${newPlannedAt}`);
        updateWorkout(activeWorkout.id, { plannedAt: newPlannedAt });
      }
    }
  }

  // --- Plan Generation Handler --- 
  const handleGeneratePlan = () => {
    const confirmClear = window.confirm(
      `Generate a new plan for the week of ${currentWeekStart.format('MMM D')}? This will remove any existing workouts for this week.`
    );
    if (confirmClear) {
      if (!userProfile) {
        alert("Cannot generate plan: User profile not loaded.");
        return;
      }
      console.log(`Clearing and generating plan for week: ${currentWeekStart.format('YYYY-MM-DD')}`);
      // Clear existing workouts for the current week first
      clearPlanForWeek(currentWeekStart.toDate());
      // Generate the new plan using the utility function via the store action
      generatePlan(currentWeekStart.toDate(), userProfile);
      // Optionally add a success message/toast here
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-white p-4 shadow rounded">
        {/* Week Navigation Header */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={goToPreviousWeek} variant="outline" size="sm">‹ Prev</Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
               Week of {currentWeekStart.format('MMMM D, YYYY')}
            </h2>
             {/* Action Buttons */}
            <div className="mt-1 space-x-2">
              <Button onClick={() => handleOpenAddModal(dayjs())} size="sm">+ Add Workout</Button>
              {/* Add Generate Plan button */}
              <Button onClick={handleGeneratePlan} variant="secondary" size="sm">Generate Plan</Button>
              <Button onClick={goToCurrentWeek} variant="link" size="sm" className="text-xs">Go to Today</Button>
            </div>
          </div>
          <Button onClick={goToNextWeek} variant="outline" size="sm">Next ›</Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px border-t border-l border-gray-200 bg-gray-200">
          {daysOfWeek.map((day) => (
            <DayCell
              key={day.format('YYYY-MM-DD')}
              day={day}
              workouts={getWorkoutsForDay(day)}
              onOpenAddModal={handleOpenAddModal}
              onOpenEditModal={handleOpenEditModal}
            />
          ))}
        </div>

         {/* Render the Modal */}
         <WorkoutModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            workoutToEdit={editingWorkout}
            selectedDate={selectedDateForNew}
        />
      </div>
    </DndContext>
  );
} 