"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex rounded border border-line bg-panel-2 p-1", className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn("rounded px-4 py-2 text-sm font-bold text-soft data-[state=active]:bg-indigo data-[state=active]:text-white", className)}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
