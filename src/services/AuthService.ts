import { sequelize } from "@/config/database";
import { env } from "@/config/env";
import { AUDIT_LOG_ACTIONS, type UserStatus } from "@/constants";
import { AppError, ConflictError, DatabaseError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateToken, hashToken } from "@/lib/crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createSessionForUser,
  destroyCurrentSession,
  setSessionCookie,
} from "@/lib/session";
import { notificationRepository } from "@/repositories/NotificationRepository";
import { planRepository } from "@/repositories/PlanRepository";
import { sessionRepository } from "@/repositories/SessionRepository";
import { userRepository } from "@/repositories/UserRepository";
import { verificationTokenRepository } from "@/repositories/VerificationTokenRepository";
import { auditLogService } from "./AuditLogService";
import { emailService } from "./EmailService";
import { organizationService } from "./OrganizationService";
import type { GoogleUserInfo } from "@/types";
import type { User } from "@/models";

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface RegisterInput {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Authentication service: register / login / logout / email verification /
 * password reset / Google OAuth.
 */
export class AuthService {
  /** Register a user + personal organization atomically */
  async register(input: RegisterInput, meta: RequestMeta = {}): Promise<User> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("An account with this email already exists");

    const freePlan = await planRepository.findBySlug("free");
    if (!freePlan) throw new DatabaseError("Default plan is missing. Run `npm run db:seed` to seed plans.");

    const passwordHash = await hashPassword(input.password);
    const status: UserStatus = env.requireEmailVerification ? "pending" : "active";

    const user = await sequelize.transaction(async (t) => {
      const created = await userRepository.create(
        {
          first_name: input.first_name,
          last_name: input.last_name ?? null,
          email: input.email,
          password_hash: passwordHash,
          email_verified: !env.requireEmailVerification,
          status,
        },
        { transaction: t }
      );

      const org = await organizationService.createForUser(created, { transaction: t });

      await notificationRepository.create(
        {
          user_id: created.id,
          type: "system",
          title: "Welcome to SEO Tools",
          message: "Add your first website to start improving its SEO.",
        },
        { transaction: t }
      );

      await auditLogService.log(
        {
          organization_id: org.id,
          user_id: created.id,
          action: AUDIT_LOG_ACTIONS.USER_REGISTERED,
          entity_type: "user",
          entity_id: created.id,
          ip_address: meta.ip ?? null,
          user_agent: meta.userAgent ?? null,
        },
        t
      );

      return created;
    });

    if (env.requireEmailVerification) {
      const token = await this.issueEmailVerification(user);
      await emailService.sendVerificationEmail(user, token);
    }

    logger.info("user_registered", { userId: user.id, email_domain: user.email.split("@")[1] });
    return user;
  }

  async issueEmailVerification(user: User): Promise<string> {
    const token = generateToken(32);
    await verificationTokenRepository.invalidateForUser(user.id, "email_verification");
    await verificationTokenRepository.create({
      user_id: user.id,
      token_hash: hashToken(token),
      type: "email_verification",
      expires_at: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    });
    return token;
  }

  async login(input: LoginInput, meta: RequestMeta = {}): Promise<User> {
    const user = await userRepository.findByEmail(input.email);

    if (!user || !user.password_hash) {
      await auditLogService.log({
        action: AUDIT_LOG_ACTIONS.USER_LOGIN_FAILED,
        entity_type: "email",
        entity_id: input.email.trim().toLowerCase(),
        ip_address: meta.ip ?? null,
        user_agent: meta.userAgent ?? null,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      await auditLogService.log({
        user_id: user.id,
        action: AUDIT_LOG_ACTIONS.USER_LOGIN_FAILED,
        entity_type: "user",
        entity_id: user.id,
        ip_address: meta.ip ?? null,
        user_agent: meta.userAgent ?? null,
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status === "suspended") {
      throw new ForbiddenError("This account has been suspended. Contact support.");
    }
    if (user.status === "pending") {
      throw new AppError("Please verify your email address before signing in", "EMAIL_NOT_VERIFIED", 403);
    }

    const { token } = await createSessionForUser(user.id, meta.ip, meta.userAgent);
    await setSessionCookie(token);

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.USER_LOGIN,
      entity_type: "user",
      entity_id: user.id,
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    logger.info("user_login", { userId: user.id });
    return user;
  }

  async logout(userId: string, meta: RequestMeta = {}): Promise<void> {
    await destroyCurrentSession();
    await auditLogService.log({
      user_id: userId,
      action: AUDIT_LOG_ACTIONS.USER_LOGOUT,
      entity_type: "user",
      entity_id: userId,
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });
  }

  async verifyEmail(token: string): Promise<User> {
    const record = await verificationTokenRepository.findValid(hashToken(token), "email_verification");
    if (!record) throw new ValidationError("This verification link is invalid or has expired");

    const user = await userRepository.findById(record.user_id);
    if (!user) throw new NotFoundError("Account not found");

    await verificationTokenRepository.markUsed(record.id);
    await userRepository.update(user.id, { status: "active", email_verified: true });

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.USER_EMAIL_VERIFIED,
      entity_type: "user",
      entity_id: user.id,
    });

    await notificationRepository.create({
      user_id: user.id,
      type: "system",
      title: "Email verified",
      message: "Your email address has been verified. You now have full access to your account.",
    });

    const refreshed = await userRepository.findById(user.id);
    if (!refreshed) throw new NotFoundError("Account not found");
    return refreshed;
  }

  /** Silent success even for unknown emails (no account enumeration) */
  async resendVerification(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || user.status === "active" || user.status === "suspended") return;
    const token = await this.issueEmailVerification(user);
    await emailService.sendVerificationEmail(user, token);
  }

  /** Silent success even for unknown emails (no account enumeration) */
  async forgotPassword(email: string, meta: RequestMeta = {}): Promise<void> {
    const user = await userRepository.findByEmail(email);
    await auditLogService.log({
      action: AUDIT_LOG_ACTIONS.USER_PASSWORD_RESET_REQUESTED,
      entity_type: "email",
      entity_id: email.trim().toLowerCase(),
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });
    if (!user || user.status === "suspended") return;

    const token = generateToken(32);
    await verificationTokenRepository.invalidateForUser(user.id, "password_reset");
    await verificationTokenRepository.create({
      user_id: user.id,
      token_hash: hashToken(token),
      type: "password_reset",
      expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    await emailService.sendPasswordResetEmail(user, token);
  }

  async resetPassword(token: string, newPassword: string, meta: RequestMeta = {}): Promise<void> {
    const record = await verificationTokenRepository.findValid(hashToken(token), "password_reset");
    if (!record) throw new ValidationError("This password reset link is invalid or has expired");

    const user = await userRepository.findById(record.user_id);
    if (!user) throw new ValidationError("This password reset link is invalid or has expired");

    const passwordHash = await hashPassword(newPassword);
    await verificationTokenRepository.markUsed(record.id);
    await userRepository.update(user.id, { password_hash: passwordHash });
    await sessionRepository.deleteAllForUser(user.id);

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.USER_PASSWORD_RESET,
      entity_type: "user",
      entity_id: user.id,
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });
    logger.info("password_reset", { userId: user.id });
  }

  async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string | null
  ): Promise<void> {
    if (!user.password_hash) {
      throw new ValidationError("This account uses Google sign-in and has no password set");
    }
    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError("Your current password is incorrect");

    const passwordHash = await hashPassword(newPassword);
    await userRepository.update(user.id, { password_hash: passwordHash });
    // Revoke every other session for security
    await sessionRepository.deleteAllForUser(user.id, currentSessionId ?? undefined);

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.USER_PASSWORD_CHANGED,
      entity_type: "user",
      entity_id: user.id,
    });
  }

  /** Find-or-create the user for a Google sign-in, then create their session */
  async googleUpsert(profile: GoogleUserInfo, meta: RequestMeta = {}): Promise<User> {
    let user = await userRepository.findByEmail(profile.email);

    if (!user) {
      const freePlan = await planRepository.findBySlug("free");
      if (!freePlan) throw new DatabaseError("Default plan is missing. Run `npm run db:seed` to seed plans.");

      const firstName = profile.given_name ?? profile.name?.split(" ")[0] ?? profile.email.split("@")[0];
      const lastName = profile.family_name ?? profile.name?.split(" ").slice(1).join(" ") ?? null;

      user = await sequelize.transaction(async (t) => {
        const created = await userRepository.create(
          {
            first_name: firstName,
            last_name: lastName,
            email: profile.email,
            password_hash: null, // OAuth-only account
            avatar: profile.picture ?? null,
            email_verified: profile.email_verified,
            status: "active",
          },
          { transaction: t }
        );
        await organizationService.createForUser(created, { transaction: t });
        return created;
      });
    } else if (user.status === "pending") {
      // Google-verified emails activate the account directly
      await userRepository.update(user.id, { status: "active", email_verified: true });
      user = (await userRepository.findById(user.id)) ?? user;
    } else if (!user.email_verified && profile.email_verified) {
      await userRepository.update(user.id, { email_verified: true });
    }

    const { token } = await createSessionForUser(user.id, meta.ip, meta.userAgent);
    await setSessionCookie(token);

    await auditLogService.log({
      user_id: user.id,
      action: AUDIT_LOG_ACTIONS.USER_GOOGLE_LOGIN,
      entity_type: "user",
      entity_id: user.id,
      ip_address: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    });

    return user;
  }



}

export const authService = new AuthService();
