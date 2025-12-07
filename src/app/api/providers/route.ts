import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { providers } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

const VALID_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single provider by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const provider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, parseInt(id)))
        .limit(1);

      if (provider.length === 0) {
        return NextResponse.json(
          { error: 'Provider not found', code: 'PROVIDER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(provider[0], { status: 200 });
    }

    // List providers with pagination, search, and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query = db.select().from(providers);

    const conditions = [];

    if (search) {
      conditions.push(like(providers.name, `%${search}%`));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json(
          { error: 'Invalid status value. Must be ACTIVE or INACTIVE', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      conditions.push(eq(providers.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(providers.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, apiUrl, apiKey, status } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'API URL is required and must be a non-empty string', code: 'MISSING_API_URL' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'API Key is required and must be a non-empty string', code: 'MISSING_API_KEY' },
        { status: 400 }
      );
    }

    // Validate API URL format
    if (!isValidUrl(apiUrl)) {
      return NextResponse.json(
        { error: 'API URL must be a valid URL format', code: 'INVALID_URL_FORMAT' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const providerStatus = status || 'ACTIVE';
    if (!VALID_STATUSES.includes(providerStatus)) {
      return NextResponse.json(
        { error: 'Status must be ACTIVE or INACTIVE', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Create provider with auto-generated timestamps
    const timestamp = new Date().toISOString();
    const newProvider = await db
      .insert(providers)
      .values({
        name: name.trim(),
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
        status: providerStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    return NextResponse.json(newProvider[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
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

    // Check if provider exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(eq(providers.id, parseInt(id)))
      .limit(1);

    if (existingProvider.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found', code: 'PROVIDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, apiUrl, apiKey, status } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and add name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    // Validate and add apiUrl if provided
    if (apiUrl !== undefined) {
      if (typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
        return NextResponse.json(
          { error: 'API URL must be a non-empty string', code: 'INVALID_API_URL' },
          { status: 400 }
        );
      }
      if (!isValidUrl(apiUrl)) {
        return NextResponse.json(
          { error: 'API URL must be a valid URL format', code: 'INVALID_URL_FORMAT' },
          { status: 400 }
        );
      }
      updates.apiUrl = apiUrl.trim();
    }

    // Validate and add apiKey if provided
    if (apiKey !== undefined) {
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        return NextResponse.json(
          { error: 'API Key must be a non-empty string', code: 'INVALID_API_KEY' },
          { status: 400 }
        );
      }
      updates.apiKey = apiKey.trim();
    }

    // Validate and add status if provided
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Status must be ACTIVE or INACTIVE', code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    // Update provider
    const updatedProvider = await db
      .update(providers)
      .set(updates)
      .where(eq(providers.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedProvider[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
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

    // Check if provider exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(eq(providers.id, parseInt(id)))
      .limit(1);

    if (existingProvider.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found', code: 'PROVIDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete provider
    const deletedProvider = await db
      .delete(providers)
      .where(eq(providers.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Provider deleted successfully',
        provider: deletedProvider[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}