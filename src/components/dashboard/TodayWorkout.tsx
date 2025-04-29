"use client";

import React from 'react';
import { useWorkoutStore, selectTodayWorkouts } from '@/store/workoutStore';
import type { Workout } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, PlayCircle, Dumbbell, Zap, Waves, PersonStanding } from 'lucide-react'; // Icons
import dayjs from 'dayjs';

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

    const handleToggle = (id: string) => {
        toggleWorkoutComplete(id);
    };

    // TODO: Implement navigation or modal opening for starting a workout
    const handleStartWorkout = (id: string) => {
        console.log(`Start workout ${id}`);
        // Example: router.push(`/workout/${id}`); or open a modal
        alert('Start workout functionality not implemented yet.');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Today's Activities</CardTitle>
            </CardHeader>
            <CardContent>
                {todayWorkouts.length === 0 ? (
                    <p className="text-muted-foreground">No workouts planned for today. Enjoy your rest!</p>
                ) : (
                    <ul className="space-y-3">
                        {todayWorkouts.map((workout) => (
                            <li key={workout.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
                                <div className="flex items-center">
                                    {getWorkoutIcon(workout.type)}
                                    <div>
                                        <span className="font-medium">{workout.type}</span>
                                        <span className="text-sm text-muted-foreground ml-2">({workout.durationMin} min)</span>
                                        {workout.completedAt && <span className="text-xs text-green-600 ml-2">(Completed)</span>}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {/* Show Start button only if not completed */}
                                    {!workout.completedAt && (
                                         <Button variant="outline" size="sm" onClick={() => handleStartWorkout(workout.id)} title="Start Workout">
                                             <PlayCircle className="h-4 w-4" />
                                             <span className="sr-only">Start</span>
                                         </Button>
                                    )}
                                    {/* Completion Toggle Button */}
                                    <Button 
                                        variant={workout.completedAt ? "secondary" : "ghost"}
                                        size="sm" 
                                        onClick={() => handleToggle(workout.id)}
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
        </Card>
    );
};

export default TodayWorkout; 