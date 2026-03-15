"use client";

import { forwardRef } from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { AlertCircle, Loader2 } from "lucide-react";

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

type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  loading?: boolean;
  error?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", loading, error, className, children, disabled, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ""}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {error && <AlertCircle className="h-4 w-4" />}
        {children}
      </BaseButton>
    );
  },
);
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
