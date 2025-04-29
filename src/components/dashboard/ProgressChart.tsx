"use client";

import React from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import type { BodyMetrics } from '@/types';
import dayjs from 'dayjs';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProgressChart: React.FC = () => {
    // Fetch all metrics, sorted ascending for the chart
    const metrics = useMetricsStore((state) => state.getMetricsSortedByDate('asc'));

    // Format data for Recharts: needs a `name` field (date) and data fields
    const chartData = metrics.map(m => ({
        name: dayjs(m.date).format('MMM D'), // Format date for X-axis label
        weight: m.weightKg,
        bodyFat: m.bodyFatPct, // Include body fat if available
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Weight & Body Fat Trend</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 0, // Adjust if Y-axis labels get cut off
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis 
                                yAxisId="left" 
                                label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', dy: 70 }} 
                                fontSize={12}
                                domain={['dataMin - 1', 'dataMax + 1']} // Add some padding
                                tickFormatter={(value) => value.toFixed(1)} 
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                label={{ value: 'Body Fat (%)', angle: 90, position: 'insideRight', dy: -70 }} 
                                fontSize={12} 
                                domain={['dataMin - 2', 'dataMax + 2']} // Add padding for % scale
                                tickFormatter={(value) => value.toFixed(1)}
                                hide={!chartData.some(d => d.bodyFat !== undefined)} // Hide if no body fat data
                            />
                            <Tooltip 
                                formatter={(value: number, name: string) => [
                                    `${value.toFixed(1)} ${name === 'weight' ? 'kg' : '%'}`, 
                                    name === 'weight' ? 'Weight' : 'Body Fat']
                                } 
                                labelFormatter={(label) => dayjs(label, 'MMM D').format('YYYY-MM-DD')}
                            />
                            <Legend />
                            <Line 
                                yAxisId="left" 
                                type="monotone" 
                                dataKey="weight" 
                                stroke="#8884d8" 
                                activeDot={{ r: 8 }} 
                                name="Weight (kg)"
                                connectNulls // Connect lines even if there are gaps in data
                            />
                            {/* Conditionally render Body Fat line if data exists */}
                            {chartData.some(d => d.bodyFat !== undefined) && (
                                <Line 
                                    yAxisId="right" 
                                    type="monotone" 
                                    dataKey="bodyFat" 
                                    stroke="#82ca9d" 
                                    name="Body Fat (%)"
                                    connectNulls
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[300px]">
                        <p className="text-muted-foreground">Need at least two data points to show a trend chart.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProgressChart; 