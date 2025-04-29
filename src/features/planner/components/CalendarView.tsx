"use client";

import React, { useState, useMemo } from 'react';
import { useWorkoutStore } from '@/store/workoutStore';
import type { Workout } from '@/types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WorkoutDetailsModal } from '@/features/planner/components/WorkoutDetailsModal';

dayjs.extend(isBetween);

// Helper to generate days for the current month view
const generateMonthDays = (monthDate: dayjs.Dayjs) => {
    const startOfMonth = monthDate.startOf('month');
    const endOfMonth = monthDate.endOf('month');
    const startDayOfWeek = startOfMonth.day(); // 0 (Sun) - 6 (Sat)
    const endDayOfMonth = endOfMonth.date();

    const days = [];
    // Add padding days from previous month
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ date: startOfMonth.subtract(startDayOfWeek - i, 'day'), isCurrentMonth: false });
    }
    // Add days of the current month
    for (let i = 1; i <= endDayOfMonth; i++) {
        days.push({ date: startOfMonth.add(i - 1, 'day'), isCurrentMonth: true });
    }
    // Add padding days from next month to fill the grid (usually up to 6 weeks total)
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
        days.push({ date: endOfMonth.add(i, 'day'), isCurrentMonth: false });
    }
    return days;
};

// Helper to get an icon based on workout type (simplified)
const getWorkoutBadge = (type: Workout['type']) => {
    const colors: Record<Workout['type'], string> = {
        CLIMB: 'bg-orange-100 text-orange-800',
        SWIM: 'bg-blue-100 text-blue-800',
        CORE: 'bg-yellow-100 text-yellow-800',
        STRENGTH: 'bg-red-100 text-red-800',
        REST: 'bg-gray-100 text-gray-800',
        MOBILITY: 'bg-green-100 text-green-800' // Added mobility
    };
    return (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors[type] || colors.STRENGTH}`}>
            {type}
        </span>
    );
};

const CalendarView: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(dayjs());
    const allWorkouts = useWorkoutStore((state) => state.workouts); // Fetch all workouts

    // State for modal control
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

    const daysInMonthView = useMemo(() => generateMonthDays(currentMonth), [currentMonth]);
    const monthStart = daysInMonthView[0].date;
    const monthEnd = daysInMonthView[daysInMonthView.length - 1].date;

    // Filter workouts relevant to the currently displayed month view (including padding days)
    const workoutsForView = useMemo(() => {
        return allWorkouts.filter(w => dayjs(w.plannedAt).isBetween(monthStart.subtract(1, 'day'), monthEnd.add(1, 'day')))
    }, [allWorkouts, monthStart, monthEnd]);

    const handlePrevMonth = () => {
        setCurrentMonth(currentMonth.subtract(1, 'month'));
    };

    const handleNextMonth = () => {
        setCurrentMonth(currentMonth.add(1, 'month'));
    };

    // Updated handler to open the modal
    const handleWorkoutClick = (workoutId: string) => {
        setSelectedWorkoutId(workoutId);
        setIsModalOpen(true);
    };

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                    {currentMonth.format('MMMM YYYY')}
                </CardTitle>
                <div className="space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-px border-t border-l border-gray-200 bg-gray-200">
                    {/* Weekday Headers */}
                    {weekdays.map(day => (
                        <div key={day} className="text-center py-2 text-sm font-medium text-gray-500 bg-gray-50 border-r border-b">
                            {day}
                        </div>
                    ))}

                    {/* Calendar Days */}
                    {daysInMonthView.map(({ date, isCurrentMonth }, index) => {
                        const dateStr = date.format('YYYY-MM-DD');
                        const workoutsOnDate = workoutsForView.filter(w => dayjs(w.plannedAt).format('YYYY-MM-DD') === dateStr);
                        const isToday = date.isSame(dayjs(), 'day');

                        return (
                            <div 
                                key={index} 
                                className={`relative p-2 border-r border-b border-gray-200 min-h-[100px] 
                                            ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                                            ${isToday ? 'bg-blue-50' : ''}`}
                            >
                                <span className={`absolute top-1 right-1 text-xs ${isToday ? 'font-bold text-blue-600' : ''}`}>
                                    {date.format('D')}
                                </span>
                                <div className="mt-4 space-y-1">
                                    {workoutsOnDate.map(workout => (
                                        <button 
                                            key={workout.id} 
                                            onClick={() => handleWorkoutClick(workout.id)}
                                            className={`w-full text-left p-1 rounded text-xs block truncate hover:bg-gray-100 ${workout.completedAt ? 'opacity-60' : ''}`}
                                            title={`${workout.type} - ${workout.durationMin} min ${workout.completedAt ? '(Completed)' : ''}`}
                                        >
                                            {getWorkoutBadge(workout.type)}
                                            {workout.completedAt && <span className="ml-1">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>

            {/* Render the Modal conditionally */} 
            {selectedWorkoutId && (
                 <WorkoutDetailsModal
                    workoutId={selectedWorkoutId}
                    isOpen={isModalOpen}
                    onOpenChange={(open) => {
                        setIsModalOpen(open);
                        if (!open) {
                            setSelectedWorkoutId(null); // Clear selection when modal closes
                        }
                    }}
                />
            )}
        </Card>
    );
};

export default CalendarView; 