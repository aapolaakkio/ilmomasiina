"use client";

import { Field as BaseField } from "@base-ui/react/field";

export const inputClassName =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500";

export const selectClassName =
  "select-control block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-12 text-sm font-normal text-gray-900 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500";

function Root({ className, ...props }: React.ComponentProps<typeof BaseField.Root>) {
  return <BaseField.Root className={`mb-4 ${className ?? ""}`} {...props} />;
}

function Label({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) {
  return <BaseField.Label className={`mb-1 block text-sm font-medium text-gray-700 ${className ?? ""}`} {...props} />;
}

function Control({ className, ...props }: React.ComponentProps<typeof BaseField.Control>) {
  return <BaseField.Control className={`${inputClassName} ${className ?? ""}`} {...props} />;
}

function Error({ className, ...props }: React.ComponentProps<typeof BaseField.Error>) {
  return <BaseField.Error className={`mt-1 text-sm text-red-600 ${className ?? ""}`} {...props} />;
}

export const Field = { Root, Label, Control, Error };
