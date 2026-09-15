import { Op, type CreationAttributes } from "sequelize";
import { VerificationToken } from "@/models";
import type { VerificationTokenType } from "@/constants";

export class VerificationTokenRepository {
  async create(attributes: CreationAttributes<VerificationToken>): Promise<VerificationToken> {
    return VerificationToken.create(attributes);
  }

  /** Find an unused, unexpired token by its hash */
  async findValid(tokenHash: string, type: VerificationTokenType): Promise<VerificationToken | null> {
    const token = await VerificationToken.findOne({
      where: { token_hash: tokenHash, type, used_at: null, expires_at: { [Op.gt]: new Date() } },
    });
    return token;
  }

  async invalidateForUser(userId: string, type: VerificationTokenType): Promise<void> {
    await VerificationToken.update({ used_at: new Date() }, { where: { user_id: userId, type, used_at: null } });
  }

  async markUsed(id: string): Promise<void> {
    await VerificationToken.update({ used_at: new Date() }, { where: { id } });
  }

  async deleteExpired(): Promise<void> {
    await VerificationToken.destroy({ where: { expires_at: { [Op.lt]: new Date() } } });
  }
}

export const verificationTokenRepository = new VerificationTokenRepository();
