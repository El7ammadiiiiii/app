"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const WIDTH_CLASSES = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
]

const getWidthClass = ( percent: number ) =>
{
  const clamped = Math.min( 100, Math.max( 0, percent ) )
  const index = Math.min( 20, Math.max( 0, Math.round( clamped / 5 ) ) )
  return WIDTH_CLASSES[ index ]
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement>
{
  value?: number
  max?: number
  indicatorClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ( { className, value = 0, max = 100, indicatorClassName, ...props }, ref ) =>
  {
    const percentage = Math.min( Math.max( ( value / max ) * 100, 0 ), 100 )

    return (
      <div
        ref={ ref }
        className={ cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          className
        ) }
        { ...props }
      >
        <div
          className={ cn(
            "h-full bg-primary transition-all duration-300 ease-in-out",
            getWidthClass( percentage ),
            indicatorClassName
          ) }
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
