import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { RoleName } from "@/backend/domain/enums/audit.enums";

export class AuthService {
  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  issueAccessToken(payload: { sub: string; role: RoleName; sectorIds: string[] }) {
    return jwt.sign(payload, process.env.JWT_SECRET ?? "dev-secret", { expiresIn: "15m" });
  }

  issueRefreshToken(payload: { sub: string }) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret", { expiresIn: "7d" });
  }
}
