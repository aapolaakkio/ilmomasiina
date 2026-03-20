"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { deleteUserAction } from "@/actions/deleteUser";
import { inviteUserAction } from "@/actions/inviteUser";
import { Link, useRouter } from "@/i18n/navigation";
import { UserID, UserRole } from "@/db/schema";
import { inviteEmailOnlySchema, type UserListResponse } from "@/db/zod";
import { firstAmongHookErrors, isHookActionPending } from "@/lib/safeActionHook";
import { useFormValidation } from "@/lib/useFormValidation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { inputClassName, selectClassName } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type Props = {
  users: UserListResponse;
};

export default function AdminUsersClient({ users }: Props) {
  const router = useRouter();
  const t = useTranslations("adminUsers");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.USER);
  const inviteValidation = useFormValidation();

  const lastDeletedEmailRef = useRef("");

  const {
    execute: executeInvite,
    status: inviteUserStatus,
    result: inviteUserResult,
    input: inviteUserInput,
    reset: resetInviteUser,
  } = useAction(inviteUserAction, {
    onSuccess: () => {
      setInviteEmail("");
      inviteValidation.clearErrors();
      router.refresh();
    },
  });

  const {
    execute: executeDelete,
    status: deleteUserActionStatus,
    result: deleteUserResult,
    reset: resetDeleteUser,
  } = useAction(deleteUserAction, {
    onSuccess: () => {
      router.refresh();
    },
  });

  const actionSuccess =
    inviteUserStatus === "hasSucceeded" && inviteUserInput?.email != null
      ? t("createSuccess", { email: inviteUserInput.email })
      : deleteUserActionStatus === "hasSucceeded"
        ? t("deleteSuccess", { user: lastDeletedEmailRef.current })
        : null;

  const actionError = firstAmongHookErrors([
    { status: inviteUserStatus, result: inviteUserResult, fallback: t("createFailed") },
    {
      status: deleteUserActionStatus,
      result: deleteUserResult,
      fallback: t("deleteFailed", { user: lastDeletedEmailRef.current }),
    },
  ]);

  const adminUsersBusy = isHookActionPending(inviteUserStatus) || isHookActionPending(deleteUserActionStatus);

  const handleInvite = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isHookActionPending(inviteUserStatus)) return;
    resetInviteUser();
    resetDeleteUser();

    const valid = inviteValidation.validate(inviteEmailOnlySchema, { email: inviteEmail }, (field) => {
      if (field === "email") return t("errors.required");
      return undefined;
    });
    if (!valid) return;

    executeInvite({ email: inviteEmail, role: inviteRole });
  };

  const handleDelete = (userId: UserID, email: string) => {
    if (!window.confirm(t("deleteConfirm", { user: email }))) return;
    if (isHookActionPending(deleteUserActionStatus)) return;
    lastDeletedEmailRef.current = email;
    resetInviteUser();
    resetDeleteUser();
    executeDelete({ userId });
  };

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
      <Link href="/admin" className="mb-4 inline-block">
        <Button variant="outline" size="small">
          {t("back")}
        </Button>
      </Link>

      {actionError && (
        <Alert variant="danger" className="mb-4">
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" className="mb-4">
          {actionSuccess}
        </Alert>
      )}

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
                    disabled={adminUsersBusy}
                    actionStatus={deleteUserActionStatus}
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

      <h2 className="mb-2 mt-8 text-xl font-bold">{t("createUser")}</h2>
      <p className="mb-4 text-sm text-gray-600">{t("createUserInfo")}</p>
      <form onSubmit={handleInvite} className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
          <div className="min-w-0 w-full sm:max-w-lg sm:flex-1">
            <input
              type="email"
              className={inputClassName}
              placeholder={t("email")}
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                inviteValidation.clearError("email");
              }}
            />
            <FieldError error={inviteValidation.fieldErrors.email} />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <select
              className={`${selectClassName} w-full sm:w-44 shrink-0`}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
            >
              <option value="user">{t("role_user")}</option>
              <option value="admin">{t("role_admin")}</option>
            </select>
            <Button
              type="submit"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              disabled={adminUsersBusy}
              actionStatus={inviteUserStatus}
            >
              {t("createSubmit")}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
