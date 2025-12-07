import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to exclude password from user object
function excludePassword(user: any) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single user fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(excludePassword(user[0]), { status: 200 });
    }

    // List users with pagination, search, and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    let query = db.select().from(users);
    const conditions = [];

    // Search by name or email
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    // Filter by role
    if (role) {
      if (!['USER', 'ADMIN'].includes(role.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid role. Must be USER or ADMIN', code: 'INVALID_ROLE' },
          { status: 400 }
        );
      }
      conditions.push(eq(users.role, role.toUpperCase()));
    }

    // Filter by status
    if (status) {
      if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or BANNED', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      conditions.push(eq(users.status, status.toUpperCase()));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Exclude passwords from all results
    const sanitizedResults = results.map(excludePassword);

    return NextResponse.json(sanitizedResults, { status: 200 });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, status, balance } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', code: 'MISSING_EMAIL' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required', code: 'MISSING_PASSWORD' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !['USER', 'ADMIN'].includes(role.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid role. Must be USER or ADMIN', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or BANNED', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Validate balance if provided
    if (balance !== undefined && (isNaN(parseFloat(balance)) || parseFloat(balance) < 0)) {
      return NextResponse.json(
        { error: 'Balance must be a non-negative number', code: 'INVALID_BALANCE' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists', code: 'EMAIL_EXISTS' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const now = new Date().toISOString();
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role: role ? role.toUpperCase() : 'USER',
      status: status ? status.toUpperCase() : 'ACTIVE',
      balance: balance !== undefined ? parseFloat(balance) : 0.00,
      createdAt: now,
      updatedAt: now,
    };

    // Insert user
    const newUser = await db.insert(users).values(userData).returning();

    return NextResponse.json(excludePassword(newUser[0]), { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, status, balance, apiKey } = body;

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and add name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate and add email if provided
    if (email !== undefined) {
      if (!isValidEmail(email.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }

      // Check email uniqueness (excluding current user)
      const emailCheck = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (emailCheck.length > 0 && emailCheck[0].id !== parseInt(id)) {
        return NextResponse.json(
          { error: 'Email already exists', code: 'EMAIL_EXISTS' },
          { status: 400 }
        );
      }

      updateData.email = email.toLowerCase().trim();
    }

    // Validate and hash password if provided
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters', code: 'PASSWORD_TOO_SHORT' },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Validate and add role if provided
    if (role !== undefined) {
      if (!['USER', 'ADMIN'].includes(role.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid role. Must be USER or ADMIN', code: 'INVALID_ROLE' },
          { status: 400 }
        );
      }
      updateData.role = role.toUpperCase();
    }

    // Validate and add status if provided
    if (status !== undefined) {
      if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, SUSPENDED, or BANNED', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      updateData.status = status.toUpperCase();
    }

    // Validate and add balance if provided
    if (balance !== undefined) {
      if (isNaN(parseFloat(balance)) || parseFloat(balance) < 0) {
        return NextResponse.json(
          { error: 'Balance must be a non-negative number', code: 'INVALID_BALANCE' },
          { status: 400 }
        );
      }
      updateData.balance = parseFloat(balance);
    }

    // Add apiKey if provided (can be null)
    if (apiKey !== undefined) {
      updateData.apiKey = apiKey ? apiKey.trim() : null;
    }

    // Update user
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    return NextResponse.json(excludePassword(updatedUser[0]), { status: 200 });
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete user
    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'User deleted successfully',
        user: excludePassword(deletedUser[0]),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}