'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Globe, BarChart3, Eye, LogOut, Shield } from 'lucide-react';
import { Button } from './ui/button';

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Domains', href: '/domains', icon: Globe },
        { name: 'Statistics', href: '/stats', icon: BarChart3 },
        { name: 'Monitoring', href: '/monitoring', icon: Eye },
    ];

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Failed to logout', error);
        }
    };

    return (
        <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300">
            <div className="flex gap-2 items-center h-16 px-6 font-bold text-white border-b border-slate-800 tracking-wide text-lg">
                <Shield className="w-5 h-5 text-blue-500" />
                Admin Panel
            </div>

            <div className="flex-1 py-4 overflow-y-auto">
                <nav className="px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors
                  ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
                            >
                                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign out
                </Button>
            </div>
        </div>
    );
}
