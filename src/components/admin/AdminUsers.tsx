"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { z } from "zod/v4";

import { changePasswordAction } from "@/actions/changePassword";
import { deleteUserAction } from "@/actions/deleteUser";
import { inviteUserAction } from "@/actions/inviteUser";
import { resetPasswordAction } from "@/actions/resetPassword";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserID, UserListResponse } from "@/models";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, inputClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

const MIN_PASSWORD_LENGTH = 10;

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
  const inviteValidation = useFormValidation();

  // Change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordVerify, setNewPasswordVerify] = useState("");
  const passwordValidation = useFormValidation();

  const inviteSchema = useMemo(() => z.object({ email: z.email().min(1).max(255) }), []);

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          oldPassword: z.string().min(1).max(255),
          newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(255),
          newPasswordVerify: z.string().min(1),
        })
        .refine((data) => data.newPassword === data.newPasswordVerify, {
          path: ["newPasswordVerify"],
          message: "verifyMatch",
        }),
    [],
  );

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

  const { execute: executeChangePassword, isPending: changePasswordPending } = useAction(changePasswordAction, {
    onSuccess: () => {
      setSuccess(t("changeSuccess"));
      setOldPassword("");
      setNewPassword("");
      setNewPasswordVerify("");
      passwordValidation.clearErrors();
    },
    onError: ({ error: err }) => {
      setError(err.serverError ?? t("changeFailed"));
    },
  });

  const handleInvite = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (invitePending) return;
      setError(null);
      setSuccess(null);

      const valid = inviteValidation.validate(inviteSchema, { email: inviteEmail }, (field) => {
        if (field === "email") return t("errors.required");
        return undefined;
      });
      if (!valid) return;

      executeInvite({ email: inviteEmail });
    },
    [inviteEmail, invitePending, inviteValidation, inviteSchema, executeInvite, t],
  );

  const handleDelete = useCallback(
    async (userId: number, email: string) => {
      // eslint-disable-next-line no-alert
      if (!window.confirm(t("deleteConfirm", { user: email }))) return;
      setProcessing(true);
      setError(null);
      setSuccess(null);
      const result = await deleteUserAction({ userId: userId as UserID });
      if (result?.serverError) {
        setError(result.serverError);
      } else {
        setSuccess(t("deleteSuccess", { user: email }));
        router.refresh();
      }
      setProcessing(false);
    },
    [router],
  );

  const handleResetPassword = useCallback(async (userId: number, email: string) => {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(t("resetConfirm", { user: email }));
    if (!confirmed) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);
    const result = await resetPasswordAction({ userId: userId as UserID });
    if (result?.serverError) {
      setError(result.serverError);
    } else {
      setSuccess(t("resetSuccess", { user: email }));
    }
    setProcessing(false);
  }, []);

  const handleChangePassword = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (changePasswordPending) return;
      setError(null);
      setSuccess(null);

      const valid = passwordValidation.validate(
        passwordSchema,
        { oldPassword, newPassword, newPasswordVerify },
        (field, msg) => {
          if (msg === "verifyMatch") return t("errors.verifyMatch");
          if (field === "newPassword" && /too small|at least/i.test(msg)) {
            return t("errors.minLength", { number: MIN_PASSWORD_LENGTH });
          }
          return t("errors.required");
        },
      );
      if (!valid) return;

      executeChangePassword({ oldPassword, newPassword });
    },
    [
      oldPassword,
      newPassword,
      newPasswordVerify,
      changePasswordPending,
      passwordValidation,
      passwordSchema,
      executeChangePassword,
      t,
    ],
  );

  const isProcessing = processing || invitePending || changePasswordPending;

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
              <th className="pb-3 font-semibold text-gray-700">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100">
                <td className="py-3 pr-4">{user.email}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="small"
                      disabled={isProcessing}
                      onClick={() => handleResetPassword(user.id, user.email)}
                    >
                      {t("resetPassword")}
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      disabled={isProcessing}
                      onClick={() => handleDelete(user.id, user.email)}
                    >
                      {t("deleteUser")}
                    </Button>
                  </div>
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
          <Button type="submit" variant="secondary" disabled={isProcessing}>
            {t("createSubmit")}
          </Button>
        </div>
      </form>

      {/* Change password */}
      <h2 className="mb-4 text-xl font-bold">{t("changePassword")}</h2>
      <form onSubmit={handleChangePassword} className="max-w-md">
        <Field.Root>
          <Field.Label htmlFor="admin-old-password">{t("oldPassword")}</Field.Label>
          <input
            id="admin-old-password"
            type="password"
            className={inputClassName}
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
              passwordValidation.clearError("oldPassword");
            }}
          />
          <FieldError error={passwordValidation.fieldErrors.oldPassword} />
        </Field.Root>
        <Field.Root>
          <Field.Label htmlFor="admin-new-password">{t("newPassword")}</Field.Label>
          <input
            id="admin-new-password"
            type="password"
            className={inputClassName}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              passwordValidation.clearError("newPassword");
            }}
          />
          <FieldError error={passwordValidation.fieldErrors.newPassword} />
        </Field.Root>
        <Field.Root>
          <Field.Label htmlFor="admin-new-password-verify">{t("newPasswordVerify")}</Field.Label>
          <input
            id="admin-new-password-verify"
            type="password"
            className={inputClassName}
            value={newPasswordVerify}
            onChange={(e) => {
              setNewPasswordVerify(e.target.value);
              passwordValidation.clearError("newPasswordVerify");
            }}
          />
          <FieldError error={passwordValidation.fieldErrors.newPasswordVerify} />
        </Field.Root>
        <Button type="submit" variant="secondary" disabled={isProcessing}>
          {t("changeSubmit")}
        </Button>
      </form>
    </>
  );
}
