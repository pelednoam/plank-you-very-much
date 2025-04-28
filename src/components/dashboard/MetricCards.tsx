import React from 'react';

// TODO: Fetch and display key metrics (Weight, BF%, Muscle Mass)
export default function MetricCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 shadow rounded">Metric Card 1 (e.g., Weight)</div>
      <div className="bg-white p-4 shadow rounded">Metric Card 2 (e.g., BF%)</div>
      <div className="bg-white p-4 shadow rounded">Metric Card 3 (e.g., Muscle Mass)</div>
    </div>
  );
} 