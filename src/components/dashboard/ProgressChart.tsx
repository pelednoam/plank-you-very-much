'use client'; // Required for Recharts

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// TODO: Fetch historical data (e.g., BodyMetrics[])
const placeholderData = [
  { date: '2025-04-01', weightKg: 75, bodyFatPct: 14.0 },
  { date: '2025-04-08', weightKg: 74.5, bodyFatPct: 13.8 },
  { date: '2025-04-15', weightKg: 74.2, bodyFatPct: 13.5 },
  { date: '2025-04-22', weightKg: 74.0, bodyFatPct: 13.4 },
  { date: '2025-04-29', weightKg: 73.8, bodyFatPct: 13.2 },
];

export default function ProgressChart() {
  return (
    <div className="bg-white p-4 shadow rounded h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={placeholderData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Body Fat (%)', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="weightKg" stroke="#8884d8" activeDot={{ r: 8 }} name="Weight"/>
          <Line yAxisId="right" type="monotone" dataKey="bodyFatPct" stroke="#82ca9d" name="Body Fat %"/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 