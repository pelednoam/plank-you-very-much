'use client'; // Needed for Zustand hook

import React from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import { useActivityStore } from '@/store/activityStore'; // Import activity store
import { useUserProfileStore } from '@/store/userProfileStore'; // Import user profile store
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Scale, Percent, Footprints, BedDouble } from 'lucide-react'; // Add icons
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

const MetricCards: React.FC = () => {
    // Get metrics data
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());
    const latestWeight = latestMetric?.weightKg;
    const latestBodyFat = latestMetric?.bodyFatPct;
    const metricDate = latestMetric?.date ? dayjs(latestMetric.date).format('ll') : 'No data';

    // Get today's activity data (Fitbit)
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayActivity = useActivityStore((state) => state.getActivityForDate(todayStr));
    const todaySteps = todayActivity?.steps;
    const todaySleep = todayActivity?.sleepMinutes;
    const activityDate = todayActivity?.date ? 'Today' : 'No data'; // Simple label for today

    // Get user profile data for synced calories
    const lastSyncedCaloriesOut = useUserProfileStore((state) => state.profile?.lastSyncedCaloriesOut);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Weight Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weight</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {latestWeight !== undefined ? `${latestWeight.toFixed(1)} kg` : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">{metricDate}</p>
                </CardContent>
            </Card>

            {/* Body Fat Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Body Fat</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {latestBodyFat !== undefined ? `${latestBodyFat.toFixed(1)} %` : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">{metricDate}</p>
                </CardContent>
            </Card>

            {/* Steps Card (Fitbit) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Steps (Today)</CardTitle>
                    <Footprints className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {todaySteps !== undefined ? todaySteps.toLocaleString() : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">{activityDate}</p>
                </CardContent>
            </Card>

            {/* Sleep Card (Fitbit) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sleep (Last Night)</CardTitle>
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {todaySleep !== undefined ? `${Math.floor(todaySleep / 60)}h ${todaySleep % 60}m` : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">{activityDate}</p>
                </CardContent>
            </Card>

             {/* Calories Out Card (from Profile Sync) */}
             <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Synced Calories Out</CardTitle>
                     <TrendingUp className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold">
                         {lastSyncedCaloriesOut !== undefined && lastSyncedCaloriesOut > 0
                             ? `${lastSyncedCaloriesOut.toLocaleString()} kcal`
                             : '-'}
                     </div>
                     <p className="text-xs text-muted-foreground">{activityDate}</p>
                 </CardContent>
             </Card>
        </div>
    );
};

export default MetricCards; 