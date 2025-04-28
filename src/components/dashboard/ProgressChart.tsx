'use client'; // Required for Recharts and Zustand hook

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useMetricsStore } from '@/store/metricsStore';
import dayjs from 'dayjs';

// Format date for XAxis display
const formatDateTick = (isoDate: string) => {
  return dayjs(isoDate).format('MMM D'); // e.g., "Apr 29"
};

export default function ProgressChart() {
  // Get sorted historical data from the store
  const historicalData = useMetricsStore((state) => state.getMetricsSortedByDate('asc'));

  if (!historicalData || historicalData.length === 0) {
    return (
        <div className="bg-white p-4 shadow rounded h-64 flex items-center justify-center">
            <p className="text-gray-500">Log your first metric to see progress here!</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-4 shadow rounded h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historicalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDateTick} 
            angle={-30} 
            textAnchor="end" 
            height={50}
            minTickGap={10}
          />
          <YAxis yAxisId="left" label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} domain={['dataMin - 1', 'dataMax + 1']} width={40} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Body Fat (%)', angle: 90, position: 'insideRight' }} domain={['dataMin - 1', 'dataMax + 1']} width={40}/>
          <Tooltip labelFormatter={formatDateTick} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="weightKg" stroke="#8884d8" activeDot={{ r: 6 }} name="Weight" connectNulls />
          <Line yAxisId="right" type="monotone" dataKey="bodyFatPct" stroke="#82ca9d" name="Body Fat %" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 