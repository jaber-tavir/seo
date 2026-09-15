import { ok, withApi } from "@/lib/api";
import { authService } from "@/services/AuthService";

export const POST = withApi(async ({ user, req }) => {
  if (user) {
    await authService.logout(user.id, {
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
  }
  return ok({ loggedOut: true });
});
