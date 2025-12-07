import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { services, providers } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single service by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, parseInt(id)))
        .limit(1);

      if (service.length === 0) {
        return NextResponse.json(
          { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(service[0], { status: 200 });
    }

    // List services with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = db.select().from(services);

    // Build filter conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(services.name, `%${search}%`),
          like(services.description, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(services.category, category));
    }

    if (type) {
      conditions.push(eq(services.type, type));
    }

    if (status) {
      conditions.push(eq(services.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(services.createdAt))
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
    const { name, category, type, description, rate, minOrder, maxOrder, providerId, status } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required', code: 'MISSING_CATEGORY' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (rate === undefined || rate === null) {
      return NextResponse.json(
        { error: 'Rate is required', code: 'MISSING_RATE' },
        { status: 400 }
      );
    }

    if (minOrder === undefined || minOrder === null) {
      return NextResponse.json(
        { error: 'Min order is required', code: 'MISSING_MIN_ORDER' },
        { status: 400 }
      );
    }

    if (maxOrder === undefined || maxOrder === null) {
      return NextResponse.json(
        { error: 'Max order is required', code: 'MISSING_MAX_ORDER' },
        { status: 400 }
      );
    }

    // Validate rate
    if (rate <= 0) {
      return NextResponse.json(
        { error: 'Rate must be greater than 0', code: 'INVALID_RATE' },
        { status: 400 }
      );
    }

    // Validate minOrder
    if (minOrder <= 0) {
      return NextResponse.json(
        { error: 'Min order must be greater than 0', code: 'INVALID_MIN_ORDER' },
        { status: 400 }
      );
    }

    // Validate maxOrder
    if (maxOrder <= minOrder) {
      return NextResponse.json(
        { error: 'Max order must be greater than min order', code: 'INVALID_MAX_ORDER' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be ACTIVE or INACTIVE', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Validate providerId if provided
    if (providerId !== undefined && providerId !== null) {
      const provider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (provider.length === 0) {
        return NextResponse.json(
          { error: 'Provider not found', code: 'PROVIDER_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    const newService = await db
      .insert(services)
      .values({
        name: name.trim(),
        category: category.trim(),
        type: type.trim(),
        description: description ? description.trim() : null,
        rate,
        minOrder,
        maxOrder,
        providerId: providerId || null,
        status: status || 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newService[0], { status: 201 });
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if service exists
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(id)))
      .limit(1);

    if (existingService.length === 0) {
      return NextResponse.json(
        { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, category, type, description, rate, minOrder, maxOrder, providerId, status } = body;

    // Validate rate if provided
    if (rate !== undefined && rate <= 0) {
      return NextResponse.json(
        { error: 'Rate must be greater than 0', code: 'INVALID_RATE' },
        { status: 400 }
      );
    }

    // Validate minOrder if provided
    if (minOrder !== undefined && minOrder <= 0) {
      return NextResponse.json(
        { error: 'Min order must be greater than 0', code: 'INVALID_MIN_ORDER' },
        { status: 400 }
      );
    }

    // Validate maxOrder relationship
    const finalMinOrder = minOrder !== undefined ? minOrder : existingService[0].minOrder;
    const finalMaxOrder = maxOrder !== undefined ? maxOrder : existingService[0].maxOrder;

    if (finalMaxOrder <= finalMinOrder) {
      return NextResponse.json(
        { error: 'Max order must be greater than min order', code: 'INVALID_MAX_ORDER' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be ACTIVE or INACTIVE', code: 'INVALID_STATUS' },
        { status: 400 }
      );
    }

    // Validate providerId if provided
    if (providerId !== undefined && providerId !== null) {
      const provider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      if (provider.length === 0) {
        return NextResponse.json(
          { error: 'Provider not found', code: 'PROVIDER_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category.trim();
    if (type !== undefined) updates.type = type.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (rate !== undefined) updates.rate = rate;
    if (minOrder !== undefined) updates.minOrder = minOrder;
    if (maxOrder !== undefined) updates.maxOrder = maxOrder;
    if (providerId !== undefined) updates.providerId = providerId || null;
    if (status !== undefined) updates.status = status;

    const updatedService = await db
      .update(services)
      .set(updates)
      .where(eq(services.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedService[0], { status: 200 });
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if service exists
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.id, parseInt(id)))
      .limit(1);

    if (existingService.length === 0) {
      return NextResponse.json(
        { error: 'Service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedService = await db
      .delete(services)
      .where(eq(services.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Service deleted successfully',
        service: deletedService[0],
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