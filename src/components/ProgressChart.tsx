'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';

// Helper function to format date for XAxis
const formatDateTick = (tickItem: string) => {
  return dayjs(tickItem).format('MMM D');
};

export const ProgressChart = () => {
  const { bodyMetrics, isHydrated } = useAppStore((state) => ({
    bodyMetrics: state.bodyMetrics,
    isHydrated: state.isHydrated,
  }));

  // Prepare data for the chart, sorted by date
  const chartData = React.useMemo(() => {
    if (!bodyMetrics) return [];
    return [...bodyMetrics]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(metric => ({
        date: metric.date, // Keep original ISO string for potential tooltips
        formattedDate: formatDateTick(metric.date), // Formatted date for display
        Weight: metric.weightKg,
        'Body Fat': metric.bodyFatPct,
      }));
  }, [bodyMetrics]);

  if (!isHydrated) {
    return (
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200 min-h-[300px]">
        <p className="text-center text-gray-500">Loading chart data...</p>
        {/* Optional: Add a skeleton loader here */}
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="p-4 bg-white rounded-lg shadow border border-gray-200 min-h-[300px]">
        <p className="text-center text-gray-500">
          Not enough data to display progress chart. Add at least two measurements.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow border border-gray-200 h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 0, // Adjust if YAxis labels are long
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="formattedDate"
            stroke="#6b7280" // gray-500
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            dataKey="Weight"
            stroke="#8884d8" // Recharts default purple
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toFixed(1)}kg`}
          />
          <YAxis
            yAxisId="right"
            dataKey="Body Fat"
            orientation="right"
            stroke="#82ca9d" // Recharts default green
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '0.5rem', border: '1px solid #e0e0e0' }}
            labelFormatter={(label) => dayjs(chartData.find(d => d.formattedDate === label)?.date).format('YYYY-MM-DD')} // Show full date on tooltip
          />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Weight"
            stroke="#8884d8"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Body Fat"
            stroke="#82ca9d"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 