import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const apiKey = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.id, parseInt(id)))
        .limit(1);

      if (apiKey.length === 0) {
        return NextResponse.json({ 
          error: 'API key not found',
          code: 'API_KEY_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(apiKey[0], { status: 200 });
    }

    // List with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = db.select().from(apiKeys);
    const conditions = [];

    // Apply filters
    if (userId) {
      if (isNaN(parseInt(userId))) {
        return NextResponse.json({ 
          error: "Valid userId is required",
          code: "INVALID_USER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(apiKeys.userId, parseInt(userId)));
    }

    if (status) {
      if (!['ACTIVE', 'REVOKED'].includes(status.toUpperCase())) {
        return NextResponse.json({ 
          error: "Status must be 'ACTIVE' or 'REVOKED'",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(apiKeys.status, status.toUpperCase()));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(apiKeys.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, status } = body;

    // Validation
    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    if (isNaN(parseInt(userId))) {
      return NextResponse.json({ 
        error: "Valid userId is required",
        code: "INVALID_USER_ID" 
      }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        error: "name is required and must be a non-empty string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'REVOKED'].includes(status.toUpperCase())) {
      return NextResponse.json({ 
        error: "Status must be 'ACTIVE' or 'REVOKED'",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Generate unique API key
    const key = `sk_${randomBytes(32).toString('hex')}`;
    const now = new Date().toISOString();

    // Create new API key - lastUsedAt is optional, so don't include if null
    const insertData: any = {
      userId: parseInt(userId),
      key: key,
      name: name.trim(),
      status: status ? status.toUpperCase() : 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    // Only add lastUsedAt if it's explicitly provided
    // For new keys, we don't set it at all (leave it as undefined in the insert)

    const newApiKey = await db.insert(apiKeys)
      .values(insertData)
      .returning();

    return NextResponse.json(newApiKey[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if ((error as Error).message.includes('UNIQUE')) {
      return NextResponse.json({ 
        error: 'API key already exists',
        code: 'DUPLICATE_KEY' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { name, status, lastUsedAt } = body;

    // Build update object with only allowed fields
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ 
          error: "name must be a non-empty string",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (status !== undefined) {
      if (!['ACTIVE', 'REVOKED'].includes(status.toUpperCase())) {
        return NextResponse.json({ 
          error: "Status must be 'ACTIVE' or 'REVOKED'",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = status.toUpperCase();
    }

    if (lastUsedAt !== undefined) {
      if (lastUsedAt === null) {
        updates.lastUsedAt = null;
      } else if (typeof lastUsedAt === 'string') {
        // Validate ISO timestamp format
        const date = new Date(lastUsedAt);
        if (isNaN(date.getTime())) {
          return NextResponse.json({ 
            error: "lastUsedAt must be a valid ISO timestamp or null",
            code: "INVALID_LAST_USED_AT" 
          }, { status: 400 });
        }
        updates.lastUsedAt = lastUsedAt;
      } else {
        return NextResponse.json({ 
          error: "lastUsedAt must be a valid ISO timestamp string or null",
          code: "INVALID_LAST_USED_AT" 
        }, { status: 400 });
      }
    }

    // Update the record
    const updated = await db.update(apiKeys)
      .set(updates)
      .where(eq(apiKeys.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'API key not found',
        code: 'API_KEY_NOT_FOUND' 
      }, { status: 404 });
    }

    // Delete the record
    const deleted = await db.delete(apiKeys)
      .where(eq(apiKeys.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'API key deleted successfully',
      deletedApiKey: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}