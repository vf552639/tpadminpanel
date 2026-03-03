'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DailyStat {
    day: string;
    total_added: number;
    available_count: number;
    unavailable_count: number;
    new_count: number;
    error_count: number;
}

export default function StatsPage() {
    const [data, setData] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/stats/daily');
                if (!res.ok) throw new Error('Failed to fetch statistics');
                const json = await res.json();
                setData(json.data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-600 rounded-lg">
                <h2 className="font-bold text-lg mb-2">Error Loading Stats</h2>
                <p>{error}</p>
            </div>
        );
    }

    const todayData = data.length > 0 ? data[0] : null;
    const yesterdayData = data.length > 1 ? data[1] : null;

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const renderComparisonBlock = (title: string, current: number, previous: number) => {
        const change = calculateChange(current, previous);
        const isPositive = change > 0;
        const isNeutral = change === 0;

        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold">{current.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Today</p>
                        </div>

                        <div className="text-right space-y-1">
                            <div className={`flex items-center justify-end font-medium text-sm ${isPositive ? 'text-green-600' : isNeutral ? 'text-slate-500' : 'text-red-600'}`}>
                                {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : !isNeutral && <ArrowDownRight className="w-4 h-4 mr-1" />}
                                {Math.abs(change).toFixed(1)}%
                            </div>
                            <p className="text-sm text-muted-foreground">Yesterday: {previous.toLocaleString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Statistics</h1>
                <p className="text-muted-foreground">
                    Daily snapshot comparisons of tracked domains based on the materialized view.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {todayData && yesterdayData ? (
                    <>
                        {renderComparisonBlock(
                            "Available Domains Found",
                            todayData.available_count,
                            yesterdayData.available_count
                        )}
                        {renderComparisonBlock(
                            "New Domains Added",
                            todayData.total_added,
                            yesterdayData.total_added
                        )}
                    </>
                ) : (
                    <Card className="col-span-2">
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
                            Not enough daily data yet to generate comparisons. Check back tomorrow!
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Optional: Add a recharts graph here in the future to map out `data` over the 30 days */}
            {data.length > 0 && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-8">
                    <Activity className="w-4 h-4" />
                    Showing {data.length} days of historical records
                </div>
            )}
        </div>
    );
}
