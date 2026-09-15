import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { organizationService } from "@/services/OrganizationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/forms/profile-form";
import { PasswordForm } from "@/components/forms/password-form";
import { SessionsList } from "@/components/dashboard/sessions-list";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const org = await organizationService.getPrimaryOrganization(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile, security and organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Signed in as <span className="text-foreground font-medium">{user.email}</span>{" "}
            {user.email_verified ? null : <Badge variant="warning">Email not verified</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
              avatar: user.avatar ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>All your projects, usage and billing belong to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{org.name}</p>
          <p className="text-muted-foreground text-xs">
            Role: owner · Team management (invites, roles) arrives with a later phase.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Use a strong, unique password. Changing it signs out your other devices.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.password_hash ? (
            <PasswordForm />
          ) : (
            <p className="text-muted-foreground text-sm">
              You signed up with Google, so no password is set. Use &ldquo;Forgot password&rdquo; on the login page to set
              one for email sign-in.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
          <CardDescription>Revoke any device you don&apos;t recognize.</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsList />
        </CardContent>
      </Card>
    </div>
  );
}
