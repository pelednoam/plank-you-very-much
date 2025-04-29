"use client";

import React, { useState } from 'react';
import { useWorkoutStore, selectTodayWorkouts } from '@/store/workoutStore';
import type { Workout } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, PlayCircle, Dumbbell, Zap, Waves, PersonStanding } from 'lucide-react'; // Icons
import dayjs from 'dayjs';
import { WorkoutDetailsModal } from '@/features/planner/components/WorkoutDetailsModal'; // Import the modal

// Helper to get an icon based on workout type
const getWorkoutIcon = (type: Workout['type']) => {
    switch (type) {
        case 'CLIMB': return <Zap className="h-5 w-5 mr-2" />;
        case 'SWIM': return <Waves className="h-5 w-5 mr-2" />;
        case 'CORE': return <PersonStanding className="h-5 w-5 mr-2" />;
        case 'STRENGTH': return <Dumbbell className="h-5 w-5 mr-2" />;
        case 'REST': return <Circle className="h-5 w-5 mr-2 text-gray-400" />;
        // Add MOBILITY if needed
        default: return <Dumbbell className="h-5 w-5 mr-2" />;
    }
};

const TodayWorkout: React.FC = () => {
    const todayWorkouts = useWorkoutStore(selectTodayWorkouts);
    const toggleWorkoutComplete = useWorkoutStore((state) => state.toggleWorkoutComplete);
    
    // State for modal control
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

    const handleToggle = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent opening modal when clicking toggle button
        toggleWorkoutComplete(id);
    };

    const handleOpenModal = (id: string) => {
        setSelectedWorkoutId(id);
        setIsModalOpen(true);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Today's Activities</CardTitle>
            </CardHeader>
            <CardContent>
                {todayWorkouts.length === 0 ? (
                    <p className="text-muted-foreground">No activities planned for today. Enjoy your rest!</p>
                ) : (
                    <ul className="space-y-3">
                        {todayWorkouts.map((workout) => (
                            <li 
                                key={workout.id} 
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-md border cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleOpenModal(workout.id)} // Open modal on li click
                            >
                                <div className="flex items-center">
                                    {getWorkoutIcon(workout.type)}
                                    <div>
                                        <span className="font-medium">{workout.type}</span>
                                        <span className="text-sm text-muted-foreground ml-2">({workout.durationMin} min)</span>
                                        {workout.completedAt && <span className="text-xs text-green-600 ml-2">(Completed)</span>}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {/* Removed Start button - modal replaces it */}
                                    
                                    {/* Completion Toggle Button - stop propagation */}
                                    <Button 
                                        variant={workout.completedAt ? "secondary" : "ghost"}
                                        size="sm" 
                                        onClick={(e) => handleToggle(e, workout.id)} // Pass event to stop propagation
                                        title={workout.completedAt ? "Mark as Incomplete" : "Mark as Complete"}
                                    >
                                        {workout.completedAt ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
                                        <span className="sr-only">{workout.completedAt ? "Mark Incomplete" : "Mark Complete"}</span>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
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

export default TodayWorkout; 