import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('USER'),
  balance: real('balance').notNull().default(0.00),
  apiKey: text('api_key'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const providers = sqliteTable('providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  apiUrl: text('api_url').notNull(),
  apiKey: text('api_key').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  rate: real('rate').notNull(),
  minOrder: integer('min_order').notNull(),
  maxOrder: integer('max_order').notNull(),
  providerId: integer('provider_id').references(() => providers.id),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  link: text('link').notNull(),
  quantity: integer('quantity').notNull(),
  charge: real('charge').notNull(),
  startCount: integer('start_count'),
  remains: integer('remains'),
  status: text('status').notNull().default('PENDING'),
  providerOrderId: text('provider_order_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  balanceBefore: real('balance_before').notNull(),
  balanceAfter: real('balance_after').notNull(),
  description: text('description').notNull(),
  orderId: integer('order_id').references(() => orders.id),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});