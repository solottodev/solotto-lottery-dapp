import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Express } from 'express';

const prisma = new PrismaClient();

/**
 * Helper to register a test user
 */
export async function registerTestUser(
  app: Express,
  email: string,
  password: string
): Promise<{ token: string; email: string }> {
  const response = await request(app)
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  return {
    token: response.body.token,
    email,
  };
}

/**
 * Helper to login a test user
 */
export async function loginTestUser(
  app: Express,
  email: string,
  password: string,
  totpCode?: string
): Promise<{ token?: string; requiresTOTP?: boolean }> {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password, totpCode });

  if (response.body.requiresTOTP) {
    return { requiresTOTP: true };
  }

  return { token: response.body.token };
}

/**
 * Helper to setup 2FA for a user
 */
export async function setup2FA(
  app: Express,
  token: string
): Promise<{ secret: string; qrCode: string }> {
  const response = await request(app)
    .post('/auth/setup-2fa')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return {
    secret: response.body.secret,
    qrCode: response.body.qrCode,
  };
}

/**
 * Helper to verify and enable 2FA
 */
export async function verify2FA(
  app: Express,
  token: string,
  totpCode: string
): Promise<boolean> {
  const response = await request(app)
    .post('/auth/verify-2fa')
    .set('Authorization', `Bearer ${token}`)
    .send({ totpCode })
    .expect(200);

  return response.body.success;
}

/**
 * Helper to create a test user directly in the database
 */
export async function createTestUserInDB(
  email: string,
  password: string
): Promise<{ id: string; email: string }> {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  return { id: user.id, email: user.email };
}

/**
 * Helper to clean up test users
 */
export async function cleanupTestUsers(emailPattern: string = '%test%'): Promise<void> {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test',
      },
    },
  });
}

/**
 * Helper to get JWT token without 2FA
 */
export async function getAuthToken(
  app: Express,
  email: string = 'test@example.com',
  password: string = 'password123'
): Promise<string> {
  // Try to login first
  let response = await request(app)
    .post('/auth/login')
    .send({ email, password });

  // If user doesn't exist, register
  if (response.status === 401) {
    response = await request(app)
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
  }

  return response.body.token;
}
