import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import { createTestApp } from '../helpers/app.helper';
import { cleanupTestUsers } from '../helpers/auth.helper';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Authentication E2E Tests', () => {
  const testEmail = 'auth-test@example.com';
  const testPassword = 'SecurePassword123!';

  beforeAll(async () => {
    // Clean up any existing test users
    await cleanupTestUsers();
  });

  afterAll(async () => {
    // Clean up after tests
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user).toBeTruthy();
      expect(user?.email).toBe(testEmail);
      expect(user?.totpEnabled).toBe(false);
    });

    it('should reject registration with missing email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          password: testPassword,
        })
        .expect(400);
    });

    it('should reject registration with missing password', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'another@example.com',
        })
        .expect(400);
    });

    it('should reject duplicate email registration', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject login with invalid email', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });

    it('should reject login with invalid password', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with missing credentials', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
        })
        .expect(400);
    });
  });

  describe('2FA Flow', () => {
    let authToken: string;
    let totpSecret: string;

    beforeAll(async () => {
      // Get auth token for 2FA setup
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      authToken = loginResponse.body.token;
    });

    describe('POST /auth/setup-2fa', () => {
      it('should setup 2FA and return QR code', async () => {
        const response = await request(app)
          .post('/auth/setup-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('secret');
        expect(response.body).toHaveProperty('qrCode');
        expect(response.body).toHaveProperty('otpauthUrl');
        expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);

        totpSecret = response.body.secret;

        // Verify secret was saved to database
        const user = await prisma.user.findUnique({
          where: { email: testEmail },
        });

        expect(user?.totpSecret).toBe(totpSecret);
        expect(user?.totpEnabled).toBe(false); // Not enabled yet
      });

      it('should reject 2FA setup without auth token', async () => {
        await request(app)
          .post('/auth/setup-2fa')
          .expect(401);
      });

      it('should reject 2FA setup with invalid token', async () => {
        await request(app)
          .post('/auth/setup-2fa')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('POST /auth/verify-2fa', () => {
      it('should verify and enable 2FA with valid TOTP code', async () => {
        // Generate a valid TOTP code
        const totpCode = speakeasy.totp({
          secret: totpSecret,
          encoding: 'base32',
        });

        const response = await request(app)
          .post('/auth/verify-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ totpCode })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify 2FA is now enabled
        const user = await prisma.user.findUnique({
          where: { email: testEmail },
        });

        expect(user?.totpEnabled).toBe(true);
      });

      it('should reject 2FA verification with invalid code', async () => {
        await request(app)
          .post('/auth/verify-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ totpCode: '000000' })
          .expect(400);
      });

      it('should reject 2FA verification without auth token', async () => {
        await request(app)
          .post('/auth/verify-2fa')
          .send({ totpCode: '123456' })
          .expect(401);
      });
    });

    describe('POST /auth/login (with 2FA enabled)', () => {
      it('should require TOTP code when 2FA is enabled', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
          })
          .expect(200);

        expect(response.body.requiresTOTP).toBe(true);
        expect(response.body).not.toHaveProperty('token');
      });

      it('should login successfully with valid TOTP code', async () => {
        const totpCode = speakeasy.totp({
          secret: totpSecret,
          encoding: 'base32',
        });

        const response = await request(app)
          .post('/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
            totpCode,
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
      });

      it('should reject login with invalid TOTP code', async () => {
        await request(app)
          .post('/auth/login')
          .send({
            email: testEmail,
            password: testPassword,
            totpCode: '000000',
          })
          .expect(401);
      });
    });

    describe('POST /auth/disable-2fa', () => {
      it('should disable 2FA with valid TOTP code', async () => {
        const totpCode = speakeasy.totp({
          secret: totpSecret,
          encoding: 'base32',
        });

        const response = await request(app)
          .post('/auth/disable-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ totpCode })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify 2FA is now disabled
        const user = await prisma.user.findUnique({
          where: { email: testEmail },
        });

        expect(user?.totpEnabled).toBe(false);
        expect(user?.totpSecret).toBeNull();
      });

      it('should reject 2FA disable with invalid code', async () => {
        // Re-enable 2FA first
        const setupResponse = await request(app)
          .post('/auth/setup-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const newSecret = setupResponse.body.secret;
        const validCode = speakeasy.totp({
          secret: newSecret,
          encoding: 'base32',
        });

        await request(app)
          .post('/auth/verify-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ totpCode: validCode })
          .expect(200);

        // Try to disable with invalid code
        await request(app)
          .post('/auth/disable-2fa')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ totpCode: '000000' })
          .expect(401);
      });
    });
  });
});
