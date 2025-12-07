import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface UserPayload {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export async function generateToken(payload: UserPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as UserPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

export async function login(email: string, password: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const validPassword = await bcrypt.compare(password, user[0].password);
    
    if (!validPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (user[0].status !== 'ACTIVE') {
      return { success: false, error: 'Account is suspended or banned' };
    }

    const payload: UserPayload = {
      id: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role as 'USER' | 'ADMIN',
    };

    const token = await generateToken(payload);
    await setAuthCookie(token);

    return { success: true, user: payload };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function register(email: string, password: string, name: string) {
  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: 'Email already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const now = new Date().toISOString();
    const newUser = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: 'USER',
        status: 'ACTIVE',
        balance: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const payload: UserPayload = {
      id: newUser[0].id,
      email: newUser[0].email,
      name: newUser[0].name,
      role: newUser[0].role as 'USER' | 'ADMIN',
    };

    const token = await generateToken(payload);
    await setAuthCookie(token);

    return { success: true, user: payload };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'An error occurred during registration' };
  }
}

export async function logout() {
  await clearAuthCookie();
}

// Middleware helper for API routes
export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return { authenticated: false, user: null };
  }
  
  const user = await verifyToken(token);
  
  if (!user) {
    return { authenticated: false, user: null };
  }
  
  return { authenticated: true, user };
}

export async function requireAdmin(request: NextRequest) {
  const { authenticated, user } = await requireAuth(request);
  
  if (!authenticated || !user) {
    return { authenticated: false, authorized: false, user: null };
  }
  
  if (user.role !== 'ADMIN') {
    return { authenticated: true, authorized: false, user };
  }
  
  return { authenticated: true, authorized: true, user };
}
