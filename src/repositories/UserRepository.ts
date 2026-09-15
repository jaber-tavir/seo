import type { CreateOptions, CreationAttributes, FindOptions, WhereOptions } from "sequelize";
import { User } from "@/models";
import type { UserRole, UserStatus } from "@/constants";

export class UserRepository {
  async findById(id: string, options?: FindOptions): Promise<User | null> {
    return User.findByPk(id, options);
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async create(attributes: CreationAttributes<User>, options?: CreateOptions): Promise<User> {
    return User.create(attributes, options);
  }

  async update(id: string, attributes: Partial<CreationAttributes<User>>): Promise<void> {
    await User.update(attributes, { where: { id } });
  }

  async updateById(id: string, attributes: Partial<CreationAttributes<User>>): Promise<User | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(attributes);
    return user;
  }

  async delete(id: string): Promise<void> {
    await User.destroy({ where: { id } });
  }

  async count(where?: WhereOptions): Promise<number> {
    return User.count({ where });
  }

  async countByStatus(status: UserStatus): Promise<number> {
    return User.count({ where: { status } });
  }

  async listAdmin(limit = 50, offset = 0): Promise<{ rows: User[]; total: number }> {
    const { rows, count } = await User.findAndCountAll({
      order: [["created_at", "DESC"]],
      limit,
      offset,
      attributes: { exclude: ["password_hash"] },
    });
    return { rows, total: count };
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    await User.update({ role }, { where: { id } });
  }
}

export const userRepository = new UserRepository();
