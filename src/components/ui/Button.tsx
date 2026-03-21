"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { AlertCircle, Loader2 } from "lucide-react";
import type { HookActionStatus } from "next-safe-action/hooks";
import { forwardRef } from "react";

import { isHookActionPending } from "@/lib/safeActionHook";

const variantClasses = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary: "bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:text-gray-400 disabled:bg-gray-50",
  ghost: "bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100 disabled:text-gray-400",
  success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-300",
} as const;

const sizeClasses = {
  default: "px-4 py-2 text-sm",
  small: "px-3 py-1.5 text-xs",
} as const;

function hasErrorStatus(s: HookActionStatus | undefined) {
  return s === "hasErrored";
}

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  /** When `actionStatus` is omitted, toggles spinner and disabled (non–safe-action usage). */
  loading?: boolean;
  /** When `actionStatus` is omitted, shows error icon. */
  error?: boolean;
  /** From `useAction` / `useOptimisticAction` `status`; drives spinner, disabled while pending, and error affordance when `hasErrored`. */
  actionStatus?: HookActionStatus;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "default", loading, error, actionStatus, className, children, disabled, ...props },
    ref,
  ) => {
    const pending = actionStatus !== undefined ? isHookActionPending(actionStatus) : Boolean(loading);
    const showErrorIcon = actionStatus !== undefined ? hasErrorStatus(actionStatus) : Boolean(error);
    const mergedDisabled = Boolean(disabled) || pending;
    const errorRing = showErrorIcon && !pending;

    return (
      <BaseButton
        ref={ref}
        disabled={mergedDisabled}
        aria-invalid={showErrorIcon ? true : undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${errorRing ? "ring-2 ring-red-500/40 ring-offset-1 ring-offset-white" : ""} ${className ?? ""}`}
        {...props}
      >
        {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
        {showErrorIcon && !pending && <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />}
        {children}
      </BaseButton>
    );
  },
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
