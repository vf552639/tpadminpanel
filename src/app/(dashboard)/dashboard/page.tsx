'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Globe, CheckCircle, AlertTriangle, Activity, Database } from 'lucide-react';

interface Metrics {
    totalDomains: number;
    newToday: number;
    newYesterday: number;
    totalAvailable: number;
    totalNew: number;
    totalErrors: number;
    availableToday: number;
    availableYesterday: number;
    timestamp: string;
    cached: boolean;
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
                await fetch('/api/cache/invalidate', { method: 'POST' });
            }

            const res = await fetch('/api/dashboard/metrics');
            if (!res.ok) throw new Error('Failed to fetch metrics');

            const data = await res.json();
            setMetrics(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Poll every 5 minutes
        const interval = setInterval(() => fetchMetrics(), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 text-red-600 rounded-lg">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    Error Loading Dashboard
                </h2>
                <p>{error}</p>
                <Button onClick={() => fetchMetrics(true)} variant="outline" className="mt-4">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of your domain tracking system.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {metrics?.cached && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                            Cached Data
                        </span>
                    )}
                    <Button
                        onClick={() => fetchMetrics(true)}
                        disabled={refreshing}
                        variant="outline"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {metrics && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="Total Domains"
                            value={metrics.totalDomains.toLocaleString()}
                            icon={Database}
                        />
                        <MetricCard
                            title="Available Domains"
                            value={metrics.totalAvailable.toLocaleString()}
                            icon={CheckCircle}
                            trend={
                                metrics.totalAvailable > 0 ? {
                                    value: Number(((metrics.availableToday / metrics.totalAvailable) * 100).toFixed(1)),
                                    label: "of total available today"
                                } : undefined
                            }
                            description="Ready to register"
                        />
                        <MetricCard
                            title="Pending Verification"
                            value={metrics.totalNew.toLocaleString()}
                            icon={Activity}
                            description="Status = 'new'"
                        />
                        <MetricCard
                            title="Errors"
                            value={metrics.totalErrors.toLocaleString()}
                            icon={AlertTriangle}
                            description="Status = 'error'"
                        />
                    </div>

                    <h2 className="text-xl font-semibold mt-8 mb-4">Daily Performance</h2>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            title="New Domains (Today)"
                            value={metrics.newToday.toLocaleString()}
                            icon={Globe}
                            description={`Yesterday: ${metrics.newYesterday.toLocaleString()}`}
                        />
                        <MetricCard
                            title="Available (Today)"
                            value={metrics.availableToday.toLocaleString()}
                            icon={CheckCircle}
                            description={`Yesterday: ${metrics.availableYesterday.toLocaleString()}`}
                        />
                    </div>

                    <p className="text-xs text-muted-foreground text-right mt-4">
                        Last updated: {new Date(metrics.timestamp).toLocaleString()}
                    </p>
                </>
            )}
        </div>
    );
}
