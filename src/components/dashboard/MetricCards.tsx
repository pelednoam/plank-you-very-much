'use client'; // Needed for Zustand hook

import React from 'react';
import { useMetricsStore, selectLatestWeight, selectLatestBodyFat } from '@/store/metricsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Scale, Percent } from 'lucide-react'; // Icons
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

const MetricCards: React.FC = () => {
    const latestMetric = useMetricsStore((state) => state.getLatestMetric());
    const latestWeight = latestMetric?.weightKg;
    const latestBodyFat = latestMetric?.bodyFatPct;
    const metricDate = latestMetric?.date ? dayjs(latestMetric.date).format('ll') : 'No data yet';

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Weight Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Weight
                    </CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {latestWeight !== undefined ? `${latestWeight.toFixed(1)} kg` : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Last updated: {metricDate}
                    </p>
                </CardContent>
            </Card>

            {/* Body Fat Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Body Fat
                    </CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {latestBodyFat !== undefined ? `${latestBodyFat.toFixed(1)} %` : '-'}
                    </div>
                     <p className="text-xs text-muted-foreground">
                        Last updated: {metricDate}
                    </p>
                </CardContent>
            </Card>

            {/* Placeholder for Muscle Mass (if added later) */}
            {/* <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Muscle Mass</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">- kg</div>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                </CardContent>
            </Card> */}

             {/* Placeholder for another metric (e.g., Visceral Fat) */}
             {/* <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Visceral Fat</CardTitle>
                     <TrendingUp className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                     <div className="text-2xl font-bold">-</div>
                     <p className="text-xs text-muted-foreground">Coming soon</p>
                 </CardContent>
             </Card> */}
        </div>
    );
};

export default MetricCards; 