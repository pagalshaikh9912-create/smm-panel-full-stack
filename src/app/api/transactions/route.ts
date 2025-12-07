import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_TRANSACTION_TYPES = ['DEPOSIT', 'ORDER', 'REFUND', 'ADMIN_ADJUSTMENT'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single transaction fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const transaction = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, parseInt(id)))
        .limit(1);

      if (transaction.length === 0) {
        return NextResponse.json(
          { error: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(transaction[0], { status: 200 });
    }

    // List transactions with pagination and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const orderId = searchParams.get('orderId');

    let query = db.select().from(transactions);

    // Build WHERE conditions
    const conditions = [];

    if (userId) {
      const userIdInt = parseInt(userId);
      if (isNaN(userIdInt)) {
        return NextResponse.json(
          { error: 'Valid userId is required', code: 'INVALID_USER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(transactions.userId, userIdInt));
    }

    if (type) {
      if (!VALID_TRANSACTION_TYPES.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`, code: 'INVALID_TYPE' },
          { status: 400 }
        );
      }
      conditions.push(eq(transactions.type, type));
    }

    if (orderId) {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        return NextResponse.json(
          { error: 'Valid orderId is required', code: 'INVALID_ORDER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(transactions.orderId, orderIdInt));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(transactions.createdAt))
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
    const { userId, type, amount, balanceBefore, balanceAfter, description, orderId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required', code: 'MISSING_AMOUNT' },
        { status: 400 }
      );
    }

    if (balanceBefore === undefined || balanceBefore === null) {
      return NextResponse.json(
        { error: 'balanceBefore is required', code: 'MISSING_BALANCE_BEFORE' },
        { status: 400 }
      );
    }

    if (balanceAfter === undefined || balanceAfter === null) {
      return NextResponse.json(
        { error: 'balanceAfter is required', code: 'MISSING_BALANCE_AFTER' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    // Validate type enum
    if (!VALID_TRANSACTION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`, code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }

    // Validate amount not zero
    if (amount === 0) {
      return NextResponse.json(
        { error: 'amount cannot be zero', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate userId is integer
    if (isNaN(parseInt(userId))) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate orderId if provided
    if (orderId !== undefined && orderId !== null && isNaN(parseInt(orderId))) {
      return NextResponse.json(
        { error: 'orderId must be a valid integer', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // Prepare insert data - only include orderId if it's not null/undefined
    const insertData: any = {
      userId: parseInt(userId),
      type: type.trim(),
      amount: parseFloat(amount),
      balanceBefore: parseFloat(balanceBefore),
      balanceAfter: parseFloat(balanceAfter),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    // Only add orderId if it's explicitly provided and not null
    if (orderId !== undefined && orderId !== null) {
      insertData.orderId = parseInt(orderId);
    }

    const newTransaction = await db
      .insert(transactions)
      .values(insertData)
      .returning();

    return NextResponse.json(newTransaction[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
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

    // Check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .limit(1);

    if (existingTransaction.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', code: 'TRANSACTION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Transaction deleted successfully',
        transaction: deleted[0],
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