import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

// Rate limiting (in-memory)
// In production, consider Redis if there are multiple instances
const rateLimit = new Map<string, { count: number, resetTime: number }>();

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();

        // Check rate limit (max 5 attempts per minute)
        if (rateLimit.has(ip)) {
            const data = rateLimit.get(ip)!;
            if (now > data.resetTime) {
                rateLimit.delete(ip);
            } else if (data.count >= 5) {
                return NextResponse.json(
                    { error: 'Too many login attempts. Try again later.' },
                    { status: 429 }
                );
            } else {
                rateLimit.set(ip, { count: data.count + 1, resetTime: data.resetTime });
            }
        } else {
            rateLimit.set(ip, { count: 1, resetTime: now + 60 * 1000 });
        }

        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        if (username !== ADMIN_USERNAME) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Success - clean rate limits
        rateLimit.delete(ip);

        // Create JWT
        const token = await signJWT({ username });

        const response = NextResponse.json({ success: true });

        // Set HTTPOnly Cookie
        response.cookies.set({
            name: 'token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
