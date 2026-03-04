import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
    sortBy: string | null;
    sortOrder: 'asc' | 'desc';
    onSort: (column: string) => void;
    onStatusChange: (domain: string, newStatus: string) => void;
}

export function DomainTable({ data, loading, sortBy, sortOrder, onSort, onStatusChange }: DomainTableProps) {
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

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <span className="ml-1 text-muted-foreground/40">↕</span>;
        return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="border rounded-md bg-white overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead
                            className="cursor-pointer select-none hover:text-foreground"
                            onClick={() => onSort('rating')}
                        >
                            Rating <SortIcon column="rating" />
                        </TableHead>
                        <TableHead
                            className="cursor-pointer select-none hover:text-foreground"
                            onClick={() => onSort('reviews_count')}
                        >
                            Reviews <SortIcon column="reviews_count" />
                        </TableHead>
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
                                    <Select
                                        value={row.status}
                                        onValueChange={(val) => onStatusChange(row.domain, val)}
                                    >
                                        <SelectTrigger className={`h-7 w-[130px] text-xs font-medium border ${getStatusColor(row.status)}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="unavailable">Unavailable</SelectItem>
                                            <SelectItem value="error">Error</SelectItem>
                                            <SelectItem value="blacklisted">Blacklisted</SelectItem>
                                        </SelectContent>
                                    </Select>
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
