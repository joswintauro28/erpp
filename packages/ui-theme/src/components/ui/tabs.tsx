"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("mt-2 outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
