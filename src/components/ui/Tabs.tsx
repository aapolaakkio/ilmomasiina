"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";

function Root(props: React.ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root {...props} />;
}

function List({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return <BaseTabs.List className={`mb-4 flex gap-1 border-b border-gray-200 ${className ?? ""}`} {...props} />;
}

function Tab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={`-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 aria-selected:border-brand-600 aria-selected:text-brand-600 ${className ?? ""}`}
      {...props}
    />
  );
}

function Panel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={className} {...props} />;
}

export const Tabs = { Root, List, Tab, Panel };
