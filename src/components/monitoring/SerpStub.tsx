'use client';

import { Search } from 'lucide-react';

export function SerpStub() {
  return (
    <div className="flex items-center justify-center h-[320px]">
      <div className="max-w-md w-full border rounded-xl bg-white px-6 py-8 text-center shadow-sm">
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex items-center justify-center rounded-full bg-blue-50 p-3">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-1">Google SERP Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Coming soon — DataForSEO-powered monitoring of your Trustpilot pages in Google search results.
        </p>
      </div>
    </div>
  );
}

