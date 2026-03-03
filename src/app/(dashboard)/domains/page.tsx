'use client';

import { useState, useEffect } from 'react';
import { FilterPanel, FilterState } from '@/components/FilterPanel';
import { DomainTable } from '@/components/DomainTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DomainsPage() {
    const [filters, setFilters] = useState<FilterState>({
        minReviews: "",
        minRating: "0",
        status: "all",
        country: "",
        categoryId: "",
        onlyRoot: true
    });

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, perPage: 50, total: 0, totalPages: 0 });

    const fetchDomains = async (currentFilters: FilterState, page: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: '50',
                onlyRoot: currentFilters.onlyRoot.toString()
            });

            const numReviews = parseInt(currentFilters.minReviews) || 0;
            if (numReviews > 0) params.append('minReviews', numReviews.toString());
            if (currentFilters.minRating !== "0") params.append('minRating', currentFilters.minRating);
            if (currentFilters.status !== "all") params.append('status', currentFilters.status);
            if (currentFilters.country) params.append('country', currentFilters.country);
            if (currentFilters.categoryId) params.append('categoryId', currentFilters.categoryId);

            const res = await fetch(`/api/domains?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch domains');

            const json = await res.json();
            setData(json.data || []);
            setPagination(json.pagination || { page: 1, perPage: 50, total: 0, totalPages: 0 });
        } catch (error) {
            console.error(error);
            // In a real app, show a toast notification here
        } finally {
            setLoading(false);
        }
    };

    // We only want to fetch on mount automatically. After that, only on submit
    useEffect(() => {
        fetchDomains(filters, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Removed `filters` from dependencies

    const handleSubmit = (currentFilters: FilterState) => {
        fetchDomains(currentFilters, 1);
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        const numReviews = parseInt(filters.minReviews) || 0;
        if (numReviews > 0) params.append('minReviews', numReviews.toString());
        if (filters.minRating !== "0") params.append('minRating', filters.minRating);
        if (filters.status !== "all") params.append('status', filters.status);
        if (filters.country) params.append('country', filters.country);
        if (filters.categoryId) params.append('categoryId', filters.categoryId);

        window.open(`/api/domains/export?${params.toString()}`, '_blank');
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchDomains(filters, newPage);
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
                <p className="text-muted-foreground">
                    Filter, search, and export your tracked domains database.
                </p>
            </div>

            <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                onSubmit={handleSubmit}
                onExport={handleExport}
            />

            <div className="flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        Showing {data.length} of {pagination.total.toLocaleString()} results
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1 || loading}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-sm font-medium px-2">
                            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || loading}
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <DomainTable data={data} loading={loading} />
            </div>
        </div>
    );
}
