/**
 * @file auth-refresh-token-rotation.spec.ts
 * @description Unit tests for Refresh Token Rotation (RTR), Replay Attack Detection, and Redis Blacklist
 * @trace docs/plans/platform/auth-refresh-token-rotation.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { LoginUseCase } from '@/modules/auth/usecases/login.usecase.js';
import { RefreshTokenUseCase } from '@/modules/auth/usecases/refresh-token.usecase.js';
import { LogoutUseCase } from '@/modules/auth/usecases/logout.usecase.js';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy.js';
import type { Request } from 'express';

vi.mock('bcrypt', () => ({
  compare: vi.fn().mockResolvedValue(true),
}));

describe('Auth Refresh Token Rotation (RTR) & Redis Blacklist Suite', () => {
  let mockUserReadRepo: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let mockJwtService: {
    sign: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
    decode: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockAuthRedisRepo: {
    saveRefreshToken: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
    deleteRefreshToken: ReturnType<typeof vi.fn>;
    revokeAllUserTokens: ReturnType<typeof vi.fn>;
    blacklistAccessToken: ReturnType<typeof vi.fn>;
    isBlacklisted: ReturnType<typeof vi.fn>;
  };

  const sampleUser = {
    id: 'user-uuid-1234',
    email: 'customer@example.com',
    password_hash: '$2b$10$hashedpasswordstringforauth',
    role: 'CUSTOMER',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserReadRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn(),
      verifyAsync: vi.fn(),
      decode: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'jwt.secret') return 'test-jwt-secret-key-123';
        if (key === 'jwt.expiresIn') return '15m';
        return null;
      }),
    };

    mockAuthRedisRepo = {
      saveRefreshToken: vi.fn().mockResolvedValue(undefined),
      getRefreshToken: vi.fn().mockResolvedValue(null),
      deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
      blacklistAccessToken: vi.fn().mockResolvedValue(undefined),
      isBlacklisted: vi.fn().mockResolvedValue(false),
    };
  });

  // ==========================================
  // 🌿 NHÁNH 1: HAPPY PATH
  // ==========================================
  describe('🌿 Nhánh 1: Happy Path', () => {
    it('HP-01: Đăng nhập cấp cả access_token (15m) và refresh_token (7d), lưu hash vào Redis', async () => {
      mockUserReadRepo.findByEmail.mockResolvedValue(sampleUser);

      mockJwtService.sign
        .mockReturnValueOnce('mocked-access-token-15m')
        .mockReturnValueOnce('mocked-refresh-token-7d');

      const loginUseCase = new LoginUseCase(
        mockUserReadRepo as any,
        mockJwtService as any,
        mockAuthRedisRepo as any,
      );

      const result = await loginUseCase.execute({
        email: 'customer@example.com',
        password: 'correct-password',
      });

      expect(result.access_token).toBe('mocked-access-token-15m');
      expect(result.refresh_token).toBe('mocked-refresh-token-7d');
      expect(result.user).toEqual({
        id: sampleUser.id,
        email: sampleUser.email,
        role: sampleUser.role,
      });

      expect(mockAuthRedisRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockAuthRedisRepo.saveRefreshToken).toHaveBeenCalledWith(
        sampleUser.id,
        expect.any(String),
        expect.any(String),
        604800, // 7 days in seconds
      );
    });

    it('HP-02: Xoay vòng token (RTR) thành công khi refresh token hợp lệ và khớp Redis hash', async () => {
      const oldRefreshToken = 'valid-old-refresh-token-string';
      const tokenId = 'token-uuid-1111';
      const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

      mockJwtService.verifyAsync.mockResolvedValue({
        id: sampleUser.id,
        tokenId,
      });
      mockUserReadRepo.findById.mockResolvedValue(sampleUser);
      mockAuthRedisRepo.getRefreshToken.mockResolvedValue(oldHash);

      mockJwtService.sign
        .mockReturnValueOnce('new-access-token-15m')
        .mockReturnValueOnce('new-refresh-token-7d');

      const refreshUseCase = new RefreshTokenUseCase(
        mockJwtService as any,
        mockConfigService as any,
        mockAuthRedisRepo as any,
        mockUserReadRepo as any,
      );

      const result = await refreshUseCase.execute({ refresh_token: oldRefreshToken });

      // Token cũ bị xóa
      expect(mockAuthRedisRepo.deleteRefreshToken).toHaveBeenCalledWith(sampleUser.id, tokenId);

      // Cấp cặp token mới
      expect(result.access_token).toBe('new-access-token-15m');
      expect(result.refresh_token).toBe('new-refresh-token-7d');
      expect(mockAuthRedisRepo.saveRefreshToken).toHaveBeenCalledWith(
        sampleUser.id,
        expect.any(String),
        expect.any(String),
        604800,
      );
    });

    it('HP-03: Đăng xuất đưa access token vào Redis blacklist và xóa refresh token', async () => {
      const accessToken = 'valid-bearer-access-token';
      const refreshToken = 'valid-refresh-token';
      const nowSeconds = Math.floor(Date.now() / 1000);

      mockJwtService.decode
        .mockReturnValueOnce({ exp: nowSeconds + 600 }) // access token còn 600s
        .mockReturnValueOnce({ tokenId: 'token-uuid-logout' }); // refresh token

      const logoutUseCase = new LogoutUseCase(
        mockJwtService as any,
        mockAuthRedisRepo as any,
      );

      const result = await logoutUseCase.execute(sampleUser.id, accessToken, refreshToken);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockAuthRedisRepo.blacklistAccessToken).toHaveBeenCalledTimes(1);
      expect(mockAuthRedisRepo.deleteRefreshToken).toHaveBeenCalledWith(sampleUser.id, 'token-uuid-logout');
    });
  });

  // ==========================================
  // ⚠️ NHÁNH 2: EDGE CASES
  // ==========================================
  describe('⚠️ Nhánh 2: Edge Cases', () => {
    it('EC-01: Refresh token cận ngày hết hạn vẫn được xoay vòng thành công và cấp đủ 7 ngày TTL', async () => {
      const nearExpRefreshToken = 'near-expiry-token';
      const tokenId = 'token-uuid-near-exp';
      const hash = crypto.createHash('sha256').update(nearExpRefreshToken).digest('hex');

      mockJwtService.verifyAsync.mockResolvedValue({
        id: sampleUser.id,
        tokenId,
        exp: Math.floor(Date.now() / 1000) + 5, // Còn 5s
      });
      mockUserReadRepo.findById.mockResolvedValue(sampleUser);
      mockAuthRedisRepo.getRefreshToken.mockResolvedValue(hash);

      mockJwtService.sign
        .mockReturnValueOnce('brand-new-access')
        .mockReturnValueOnce('brand-new-refresh');

      const refreshUseCase = new RefreshTokenUseCase(
        mockJwtService as any,
        mockConfigService as any,
        mockAuthRedisRepo as any,
        mockUserReadRepo as any,
      );

      const result = await refreshUseCase.execute({ refresh_token: nearExpRefreshToken });
      expect(result.access_token).toBe('brand-new-access');
      expect(mockAuthRedisRepo.saveRefreshToken).toHaveBeenCalledWith(
        sampleUser.id,
        expect.any(String),
        expect.any(String),
        604800,
      );
    });

    it('EC-02: Logout khi access token chỉ còn 3s TTL -> Blacklist được gán chính xác TTL 3s', async () => {
      const accessToken = 'short-lived-access-token';
      const nowSeconds = Math.floor(Date.now() / 1000);

      mockJwtService.decode.mockReturnValueOnce({ exp: nowSeconds + 3 });

      const logoutUseCase = new LogoutUseCase(
        mockJwtService as any,
        mockAuthRedisRepo as any,
      );

      await logoutUseCase.execute(sampleUser.id, accessToken);

      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
      expect(mockAuthRedisRepo.blacklistAccessToken).toHaveBeenCalledWith(
        tokenHash,
        expect.closeTo(3, 1),
      );
    });

    it('EC-03: Logout không gửi refresh_token -> Chỉ blacklist access token an toàn không crash', async () => {
      const accessToken = 'access-token-only';
      const nowSeconds = Math.floor(Date.now() / 1000);

      mockJwtService.decode.mockReturnValueOnce({ exp: nowSeconds + 300 });

      const logoutUseCase = new LogoutUseCase(
        mockJwtService as any,
        mockAuthRedisRepo as any,
      );

      const result = await logoutUseCase.execute(sampleUser.id, accessToken, undefined);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockAuthRedisRepo.blacklistAccessToken).toHaveBeenCalledTimes(1);
      expect(mockAuthRedisRepo.deleteRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 🛑 NHÁNH 3: ERROR & SECURITY FLOW
  // ==========================================
  describe('🛑 Nhánh 3: Error / Security Flow', () => {
    it('EF-01: Gửi refresh token sai chữ ký hoặc hết hạn -> Bị từ chối UnauthorizedException', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const refreshUseCase = new RefreshTokenUseCase(
        mockJwtService as any,
        mockConfigService as any,
        mockAuthRedisRepo as any,
        mockUserReadRepo as any,
      );

      await expect(
        refreshUseCase.execute({ refresh_token: 'expired-or-malformed-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('EF-02 (Replay Attack): Tái sử dụng token cũ đã bị xoay vòng -> Thu hồi toàn bộ session của user', async () => {
      const compromisedToken = 'stolen-already-rotated-token';
      const tokenId = 'token-uuid-stolen';

      mockJwtService.verifyAsync.mockResolvedValue({
        id: sampleUser.id,
        tokenId,
      });
      mockUserReadRepo.findById.mockResolvedValue(sampleUser);
      // Redis trả về null vì token này đã bị xóa ở lần đổi hợp lệ trước đó
      mockAuthRedisRepo.getRefreshToken.mockResolvedValue(null);

      const refreshUseCase = new RefreshTokenUseCase(
        mockJwtService as any,
        mockConfigService as any,
        mockAuthRedisRepo as any,
        mockUserReadRepo as any,
      );

      await expect(
        refreshUseCase.execute({ refresh_token: compromisedToken }),
      ).rejects.toThrow(UnauthorizedException);

      // Kích hoạt cơ chế an ninh: Thu hồi TẤT CẢ tokens của user
      expect(mockAuthRedisRepo.revokeAllUserTokens).toHaveBeenCalledWith(sampleUser.id);
    });

    it('EF-03: Gửi access token nằm trong Redis Blacklist tới JwtStrategy -> Bị từ chối 401', async () => {
      const blacklistedToken = 'revoked-access-token';
      const tokenHash = crypto.createHash('sha256').update(blacklistedToken).digest('hex');

      mockAuthRedisRepo.isBlacklisted.mockImplementation(async (hash: string) => {
        return hash === tokenHash;
      });

      const jwtStrategy = new JwtStrategy(
        mockConfigService as any,
        mockAuthRedisRepo as any,
      );

      const mockRequest = {
        headers: {
          authorization: `Bearer ${blacklistedToken}`,
        },
      } as unknown as Request;

      await expect(
        jwtStrategy.validate(mockRequest, {
          id: sampleUser.id,
          email: sampleUser.email,
          role: sampleUser.role,
        }),
      ).rejects.toThrow(new UnauthorizedException('Token has been revoked'));
    });
  });
});
