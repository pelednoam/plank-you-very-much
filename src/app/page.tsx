import React from 'react';
import MetricCards from '@/components/dashboard/MetricCards';
import ProgressChart from '@/components/dashboard/ProgressChart';
import TodayWorkout from '@/components/dashboard/TodayWorkout';

// Placeholder components (to be implemented later)
// const MetricCards = () => <div>Metric Cards Placeholder</div>;
// const ProgressChart = () => <div>Progress Chart Placeholder</div>;
// const TodayWorkout = () => <div>Today's Workout Placeholder</div>;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Section 10 components */}
      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="text-xl font-semibold mb-2 sr-only">Key Metrics</h2>
        <MetricCards />
      </section>

      <section aria-labelledby="progress-title">
        <h2 id="progress-title" className="text-xl font-semibold mb-2">Progress Overview</h2>
        <ProgressChart />
      </section>

      <section aria-labelledby="today-workout-title">
        <h2 id="today-workout-title" className="text-xl font-semibold mb-2">Today's Plan</h2>
        <TodayWorkout />
      </section>
    </div>
  );
}
