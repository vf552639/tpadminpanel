import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface Domain {
    domain: string;
    rating: number;
    reviews_count: number;
    status: string;
    country_code: string | null;
    expiry_date: string | null;
    created_at: string;
}

interface DomainTableProps {
    data: Domain[];
    loading: boolean;
}

export function DomainTable({ data, loading }: DomainTableProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'text-green-600 bg-green-50 border-green-200';
            case 'unavailable': return 'text-red-600 bg-red-50 border-red-200';
            case 'error': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'new': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'checking': return 'text-purple-600 bg-purple-50 border-purple-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="border rounded-md bg-white overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Reviews</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Added</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Loading domains...
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No domains found matching your filters.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row, i) => (
                            <TableRow key={`${row.domain}-${i}`}>
                                <TableCell className="font-medium">{row.domain}</TableCell>
                                <TableCell>
                                    {row.rating ? (
                                        <span className="inline-flex items-center gap-1">
                                            ⭐ {Number(row.rating).toFixed(1)}
                                        </span>
                                    ) : '-'}
                                </TableCell>
                                <TableCell>{row.reviews_count}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(row.status)}`}>
                                        {row.status}
                                    </span>
                                </TableCell>
                                <TableCell>{row.country_code || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {new Date(row.created_at).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
