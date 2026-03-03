import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface FilterState {
    minReviews: number;
    minRating: string;
    status: string;
    country: string;
    categoryId: string;
    onlyRoot: boolean;
}

interface FilterPanelProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onSubmit: (filters: FilterState) => void;
    onExport: () => void;
}

export function FilterPanel({ filters, onFilterChange, onSubmit, onExport }: FilterPanelProps) {
    const handleChange = (key: keyof FilterState, value: any) => {
        onFilterChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Min Reviews */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Min Reviews</label>
                    <Input
                        type="number"
                        min="0"
                        value={filters.minReviews}
                        onChange={(e) => handleChange('minReviews', parseInt(e.target.value) || 0)}
                    />
                </div>

                {/* Min Rating */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Min Rating</label>
                    <Select value={filters.minRating} onValueChange={(val) => handleChange('minRating', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Any</SelectItem>
                            <SelectItem value="1">1.0+</SelectItem>
                            <SelectItem value="2">2.0+</SelectItem>
                            <SelectItem value="3">3.0+</SelectItem>
                            <SelectItem value="4">4.0+</SelectItem>
                            <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={filters.status} onValueChange={(val) => handleChange('status', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="blacklisted">Blacklisted</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Country */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Country (Code)</label>
                    <Input
                        type="text"
                        placeholder="e.g. US, UK"
                        value={filters.country}
                        onChange={(e) => handleChange('country', e.target.value.toUpperCase())}
                    />
                </div>

                {/* Actions Button */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end lg:pt-6">
                    <Button onClick={() => onSubmit(filters)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Apply Filters
                    </Button>
                    <Button onClick={onExport} variant="outline" className="w-full">
                        Download CSV
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox
                    id="root-domains"
                    checked={filters.onlyRoot}
                    onCheckedChange={(checked) => handleChange('onlyRoot', !!checked)}
                />
                <label
                    htmlFor="root-domains"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Show only root domains (hide subdomains like shop.brand.com)
                </label>
            </div>
        </div>
    );
}
