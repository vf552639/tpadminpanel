import { useState } from 'react';
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
    minReviews: string;
    ratingMin: string;
    ratingMax: string;
    status: string;
    country: string;
    categoryId: string;
    onlyRoot: boolean;
    tld: string;
}

interface FilterPanelProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    onSubmit: (filters: FilterState) => void;
    onExport: () => void;
}

export function FilterPanel({ filters, onFilterChange, onSubmit, onExport }: FilterPanelProps) {
    const [customRating, setCustomRating] = useState(false);

    const handleChange = (key: keyof FilterState, value: any) => {
        onFilterChange({ ...filters, [key]: value });
    };

    // FIX: Update multiple filter fields in a single state update
    const handleMultiChange = (updates: Partial<FilterState>) => {
        onFilterChange({ ...filters, ...updates });
    };

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Min Reviews */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Min Reviews</label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={filters.minReviews}
                        onChange={(e) => handleChange('minReviews', e.target.value)}
                    />
                </div>

                {/* Rating Filter */}
                <div className="space-y-3 lg:col-span-2">
                    <label className="text-sm font-medium">Rating Range</label>

                    {/* Row 1 */}
                    <div className="flex flex-wrap gap-1">
                        {[
                            { label: 'Any', min: '0', max: '' },
                            { label: '1.0+', min: '1', max: '' },
                            { label: '2.0+', min: '2', max: '' },
                            { label: '3.0+', min: '3', max: '' },
                            { label: '4.0+', min: '4', max: '' },
                            { label: '4.5+', min: '4.5', max: '' },
                        ].map((preset) => (
                            <Button
                                key={preset.label}
                                size="sm"
                                variant={
                                    filters.ratingMin === preset.min && filters.ratingMax === preset.max
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => {
                                    handleMultiChange({
                                        ratingMin: preset.min,
                                        ratingMax: preset.max,
                                    });
                                    setCustomRating(false);
                                }}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Row 2 */}
                    <div className="flex flex-wrap gap-1">
                        {[
                            { label: '3.5–4.0', min: '3.5', max: '4.0' },
                            { label: '4.0–4.5', min: '4.0', max: '4.5' },
                            { label: '4.5–5.0', min: '4.5', max: '5.0' },
                        ].map((preset) => (
                            <Button
                                key={preset.label}
                                size="sm"
                                variant={
                                    filters.ratingMin === preset.min && filters.ratingMax === preset.max
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => {
                                    handleMultiChange({
                                        ratingMin: preset.min,
                                        ratingMax: preset.max,
                                    });
                                    setCustomRating(false);
                                }}
                            >
                                {preset.label}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            variant={customRating ? 'default' : 'outline'}
                            onClick={() => setCustomRating(!customRating)}
                        >
                            Custom
                        </Button>
                    </div>

                    {/* Custom Inputs */}
                    {customRating && (
                        <div className="flex gap-2 items-center">
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                placeholder="From"
                                value={filters.ratingMin}
                                onChange={(e) => handleChange('ratingMin', e.target.value)}
                                className="w-20 h-8"
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                placeholder="To"
                                value={filters.ratingMax}
                                onChange={(e) => handleChange('ratingMax', e.target.value)}
                                className="w-20 h-8"
                            />
                        </div>
                    )}
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

                {/* TLD Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Domain Extension</label>
                    <Input
                        type="text"
                        placeholder="e.g. .com, .de"
                        value={filters.tld}
                        onChange={(e) => handleChange('tld', e.target.value.toLowerCase().trim())}
                    />
                </div>

                {/* Actions Button */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end lg:pt-6">
                    <Button onClick={() => onSubmit(filters)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Apply Filters
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 justify-between items-center pt-2 border-t">
                <div className="flex items-center space-x-2">
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

                <Button onClick={onExport} variant="outline" size="sm">
                    Export CSV
                </Button>
            </div>
        </div>
    );
}
