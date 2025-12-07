import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, services, users } from '@/db/schema';
import { eq, like, and, desc } from 'drizzle-orm';

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'PARTIAL', 'REFUNDED'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single order by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, parseInt(id)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json({ 
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(order[0], { status: 200 });
    }

    // List orders with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const serviceId = searchParams.get('serviceId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = db.select().from(orders);
    const conditions = [];

    if (userId) {
      const userIdInt = parseInt(userId);
      if (isNaN(userIdInt)) {
        return NextResponse.json({ 
          error: "Valid userId is required",
          code: "INVALID_USER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(orders.userId, userIdInt));
    }

    if (serviceId) {
      const serviceIdInt = parseInt(serviceId);
      if (isNaN(serviceIdInt)) {
        return NextResponse.json({ 
          error: "Valid serviceId is required",
          code: "INVALID_SERVICE_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(orders.serviceId, serviceIdInt));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status.toUpperCase())) {
        return NextResponse.json({ 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(orders.status, status.toUpperCase()));
    }

    if (search) {
      conditions.push(like(orders.link, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(orders.createdAt))
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
    const { userId, serviceId, link, quantity, charge, startCount, remains, status, providerOrderId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    if (!serviceId) {
      return NextResponse.json({ 
        error: "serviceId is required",
        code: "MISSING_SERVICE_ID" 
      }, { status: 400 });
    }

    if (!link || typeof link !== 'string' || link.trim() === '') {
      return NextResponse.json({ 
        error: "link is required and must be a non-empty string",
        code: "MISSING_LINK" 
      }, { status: 400 });
    }

    if (quantity === undefined || quantity === null) {
      return NextResponse.json({ 
        error: "quantity is required",
        code: "MISSING_QUANTITY" 
      }, { status: 400 });
    }

    if (charge === undefined || charge === null) {
      return NextResponse.json({ 
        error: "charge is required",
        code: "MISSING_CHARGE" 
      }, { status: 400 });
    }

    // Validate data types and constraints
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ 
        error: "userId must be a valid integer",
        code: "INVALID_USER_ID" 
      }, { status: 400 });
    }

    const serviceIdInt = parseInt(serviceId);
    if (isNaN(serviceIdInt)) {
      return NextResponse.json({ 
        error: "serviceId must be a valid integer",
        code: "INVALID_SERVICE_ID" 
      }, { status: 400 });
    }

    const quantityInt = parseInt(quantity);
    if (isNaN(quantityInt) || quantityInt <= 0) {
      return NextResponse.json({ 
        error: "quantity must be a positive integer",
        code: "INVALID_QUANTITY" 
      }, { status: 400 });
    }

    const chargeFloat = parseFloat(charge);
    if (isNaN(chargeFloat) || chargeFloat <= 0) {
      return NextResponse.json({ 
        error: "charge must be a positive number",
        code: "INVALID_CHARGE" 
      }, { status: 400 });
    }

    // Validate status if provided
    const orderStatus = status ? status.toUpperCase() : 'PENDING';
    if (!VALID_STATUSES.includes(orderStatus)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate foreign keys exist
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      }, { status: 400 });
    }

    const serviceExists = await db.select()
      .from(services)
      .where(eq(services.id, serviceIdInt))
      .limit(1);

    if (serviceExists.length === 0) {
      return NextResponse.json({ 
        error: "Service not found",
        code: "SERVICE_NOT_FOUND" 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData: any = {
      userId: userIdInt,
      serviceId: serviceIdInt,
      link: link.trim(),
      quantity: quantityInt,
      charge: chargeFloat,
      status: orderStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (startCount !== undefined && startCount !== null) {
      const startCountInt = parseInt(startCount);
      if (!isNaN(startCountInt)) {
        insertData.startCount = startCountInt;
      }
    }

    if (remains !== undefined && remains !== null) {
      const remainsInt = parseInt(remains);
      if (!isNaN(remainsInt)) {
        insertData.remains = remainsInt;
      }
    }

    if (providerOrderId !== undefined && providerOrderId !== null && typeof providerOrderId === 'string') {
      insertData.providerOrderId = providerOrderId.trim();
    }

    const newOrder = await db.insert(orders)
      .values(insertData)
      .returning();

    return NextResponse.json(newOrder[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const orderId = parseInt(id);

    // Check if order exists
    const existingOrder = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { status, startCount, remains, providerOrderId } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and add status if provided
    if (status !== undefined) {
      const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';
      if (!VALID_STATUSES.includes(statusUpper)) {
        return NextResponse.json({ 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = statusUpper;
    }

    // Validate and add startCount if provided
    if (startCount !== undefined && startCount !== null) {
      const startCountInt = parseInt(startCount);
      if (isNaN(startCountInt)) {
        return NextResponse.json({ 
          error: "startCount must be a valid integer",
          code: "INVALID_START_COUNT" 
        }, { status: 400 });
      }
      updates.startCount = startCountInt;
    }

    // Validate and add remains if provided
    if (remains !== undefined && remains !== null) {
      const remainsInt = parseInt(remains);
      if (isNaN(remainsInt)) {
        return NextResponse.json({ 
          error: "remains must be a valid integer",
          code: "INVALID_REMAINS" 
        }, { status: 400 });
      }
      updates.remains = remainsInt;
    }

    // Add providerOrderId if provided
    if (providerOrderId !== undefined && providerOrderId !== null) {
      if (typeof providerOrderId === 'string') {
        updates.providerOrderId = providerOrderId.trim();
      } else {
        return NextResponse.json({ 
          error: "providerOrderId must be a string",
          code: "INVALID_PROVIDER_ORDER_ID" 
        }, { status: 400 });
      }
    }

    const updated = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, orderId))
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const orderId = parseInt(id);

    // Check if order exists
    const existingOrder = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(orders)
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json({
      message: 'Order deleted successfully',
      order: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}