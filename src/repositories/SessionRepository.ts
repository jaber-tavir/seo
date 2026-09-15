import { Op, type CreationAttributes } from "sequelize";
import { Session, User } from "@/models";

export interface SessionWithUser extends Session {
  user: User;
}

export class SessionRepository {
  async create(attributes: CreationAttributes<Session>): Promise<Session> {
    return Session.create(attributes);
  }

  async findValidByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    const session = await Session.findOne({
      where: { token_hash: tokenHash },
      include: [{ model: User, as: "user" }],
    });
    if (!session) return null;
    if (session.expires_at.getTime() < Date.now()) {
      await session.destroy();
      return null;
    }
    return session as SessionWithUser;
  }

  async touch(id: string): Promise<void> {
    await Session.update({ last_used_at: new Date() }, { where: { id } });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await Session.destroy({ where: { token_hash: tokenHash } });
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await Session.destroy({ where: { id, user_id: userId } });
  }

  async deleteAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await Session.destroy({
      where: exceptSessionId ? { user_id: userId, id: { [Op.ne]: exceptSessionId } } : { user_id: userId },
    });
  }

  async deleteExpired(): Promise<void> {
    await Session.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
  }

  async listByUser(userId: string): Promise<Session[]> {
    return Session.findAll({
      where: { user_id: userId },
      order: [["last_used_at", "DESC"]],
    });
  }
}

export const sessionRepository = new SessionRepository();
