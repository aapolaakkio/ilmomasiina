"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { deleteUserAction } from "@/actions/deleteUser";
import { inviteUserAction } from "@/actions/inviteUser";
import { Link, useRouter } from "@/i18n/navigation";
import { UserID, UserRole } from "@/db/schema";
import { inviteEmailOnlySchema, type UserListResponse } from "@/db/zod";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type Props = {
  users: UserListResponse;
};

export default function AdminUsersClient({ users }: Props) {
  const router = useRouter();
  const t = useTranslations("adminUsers");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.USER);
  const inviteValidation = useFormValidation();

  const { execute: executeInvite, isPending: invitePending } = useAction(inviteUserAction, {
    onSuccess: () => {
      setSuccess(t("createSuccess", { email: inviteEmail }));
      setInviteEmail("");
      inviteValidation.clearErrors();
      router.refresh();
    },
    onError: ({ error: err }) => {
      setError(err.serverError ?? t("createFailed"));
    },
  });

  const handleInvite = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invitePending) return;
    setError(null);
    setSuccess(null);

    const valid = inviteValidation.validate(inviteEmailOnlySchema, { email: inviteEmail }, (field) => {
      if (field === "email") return t("errors.required");
      return undefined;
    });
    if (!valid) return;

    executeInvite({ email: inviteEmail, role: inviteRole });
  };

  const handleDelete = async (userId: UserID, email: string) => {
    if (!window.confirm(t("deleteConfirm", { user: email }))) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);
    const result = await deleteUserAction({ userId });
    if (result?.serverError) {
      setError(result.serverError);
    } else {
      setSuccess(t("deleteSuccess", { user: email }));
      router.refresh();
    }
    setProcessing(false);
  };

  const isProcessing = processing || invitePending;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <Link href="/admin" className="mb-4 inline-block">
        <Button variant="outline" size="small">
          {t("back")}
        </Button>
      </Link>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* User list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("email")}</th>
              <th className="pb-3 pr-4 font-semibold text-gray-700">{t("role")}</th>
              <th className="pb-3 font-semibold text-gray-700">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100">
                <td className="py-3 pr-4">{user.email}</td>
                <td className="py-3 pr-4 text-gray-600">{t(`role_${user.role}`)}</td>
                <td className="py-3">
                  <Button
                    variant="danger"
                    size="small"
                    disabled={isProcessing}
                    onClick={() => handleDelete(user.id, user.email)}
                  >
                    {t("deleteUser")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      <h2 className="mb-2 mt-8 text-xl font-bold">{t("createUser")}</h2>
      <p className="mb-4 text-sm text-gray-600">{t("createUserInfo")}</p>
      <form onSubmit={handleInvite} className="mb-8">
        <div className="flex gap-2">
          <div>
            <input
              type="email"
              className={`${inputClassName} max-w-xs`}
              placeholder={t("email")}
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                inviteValidation.clearError("email");
              }}
            />
            <FieldError error={inviteValidation.fieldErrors.email} />
          </div>
          <select
            className={inputClassName}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
          >
            <option value="user">{t("role_user")}</option>
            <option value="admin">{t("role_admin")}</option>
          </select>
          <Button type="submit" variant="secondary" disabled={isProcessing}>
            {t("createSubmit")}
          </Button>
        </div>
      </form>
    </>
  );
}
