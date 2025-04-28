'use client'; // Needed for Zustand hook

import React from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import { useUserProfileStore } from '@/store/userProfileStore'; // Import profile store
import type { BodyMetrics } from '@/types';
import {
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateProteinTarget
} from '@/lib/calculationUtils'; // Import calculation utils

// Helper to format metric values
const formatMetric = (value: number | null | undefined, unit: string, precision = 0) => {
    // Added precision=0 as default for kcal/g
    return value !== undefined && value !== null ? `${value.toFixed(precision)} ${unit}` : 'N/A';
};

// TODO: Fetch and display key metrics (Weight, BF%, Muscle Mass)
export default function MetricCards() {
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());
    const userProfile = useUserProfileStore((state) => state.profile); // Get user profile

    // Calculate core metrics
    const bmr = React.useMemo(() => calculateBMR(userProfile || {}, latestMetric ?? null), [userProfile, latestMetric]);
    const tdee = React.useMemo(() => calculateTDEE(bmr, userProfile?.activityLevel), [bmr, userProfile?.activityLevel]);
    const calorieTarget = React.useMemo(() => calculateCalorieTarget(tdee), [tdee]);
    const proteinTarget = React.useMemo(() => calculateProteinTarget(latestMetric ?? null), [latestMetric]);

    const lastMetricDate = latestMetric?.date ? new Date(latestMetric.date).toLocaleDateString() : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weight Card */}
            <MetricCard title="Latest Weight" value={formatMetric(latestMetric?.weightKg, 'kg', 1)} date={lastMetricDate} />

            {/* Body Fat Card */}
            <MetricCard title="Body Fat %" value={formatMetric(latestMetric?.bodyFatPct, '%', 1)} date={lastMetricDate} />

            {/* Muscle Mass Card - Keep if data exists */}
            {latestMetric?.muscleMassKg !== undefined && (
                 <MetricCard title="Muscle Mass" value={formatMetric(latestMetric?.muscleMassKg, 'kg', 1)} date={lastMetricDate} />
            )}

            {/* Calculated TDEE Card */}
            <MetricCard title="Est. TDEE" value={formatMetric(tdee, 'kcal')} tooltip="Estimated Total Daily Energy Expenditure based on BMR and activity level." />

            {/* Calculated Calorie Target Card */}
            <MetricCard title="Calorie Target" value={formatMetric(calorieTarget, 'kcal')} tooltip="Daily calorie goal for fat loss target." />

            {/* Calculated Protein Target Card */}
            <MetricCard title="Protein Target" value={formatMetric(proteinTarget, 'g')} tooltip="Daily protein goal based on lean body mass." />

             {/* BMR Card (Optional - Less prominent?) */}
            {/* <MetricCard title="BMR" value={formatMetric(bmr, 'kcal')} date={lastMetricDate} /> */}
        </div>
    );
}

// Helper sub-component for individual cards to reduce repetition
interface MetricCardProps {
    title: string;
    value: string;
    date?: string | null;
    tooltip?: string; // Optional tooltip for calculated values
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, date, tooltip }) => {
    return (
        <div className="bg-white p-4 shadow rounded relative group">
            <h3 className="text-sm font-medium text-gray-500 truncate flex items-center">
                {title}
                {tooltip && (
                    <span className="ml-1 text-gray-400 cursor-help" title={tooltip}>ⓘ</span>
                )}
            </h3>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
                {value}
            </p>
            {date && (
                <p className="text-xs text-gray-500 mt-1">As of {date}</p>
            )}
            {/* Optional: Tooltip display on hover if needed, simplified with title attribute for now */}
        </div>
    );
}; 