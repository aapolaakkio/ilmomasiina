"use client";

type Props = {
  label: string;
  show: boolean;
};

export function TabWithErrorDot({ label, show }: Props) {
  return (
    <>
      {label}
      {show ? <span className="ml-1 inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden /> : null}
    </>
  );
}
