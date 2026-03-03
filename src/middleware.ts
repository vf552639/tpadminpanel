import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

const publicRoutes = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (publicRoutes.includes(pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;

    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const payload = await verifyJWT(token);

        // Add user data to headers for downstream access if needed
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-username', payload.username as string);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (error) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        // If token is invalid clear cookie and redirect
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }
}

// Config to run on all paths except static files
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
