const variantClasses = {
  danger: "border-red-200 bg-red-50 text-red-800",
  success: "border-green-200 bg-green-50 text-green-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
} as const;

type AlertProps = React.ComponentProps<"div"> & {
  variant: keyof typeof variantClasses;
};

export function Alert({ variant, className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-md border px-4 py-3 text-sm ${variantClasses[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
