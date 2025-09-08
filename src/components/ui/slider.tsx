import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      "min-h-[44px] cursor-pointer", // Mobile-first touch target
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative h-2 w-full grow rounded-full",
      "bg-secondary border-2 border-border",
      "shadow-inner max-w-[140px]", // Prevent text overlap
      "overflow-visible" // Fix: Remove overflow-hidden for better visibility
    )}>
      <SliderPrimitive.Range className="absolute h-full bg-primary rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={cn(
      "block rounded-full border-2 border-primary bg-background",
      "ring-offset-background transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "cursor-grab active:cursor-grabbing",
      "hover:scale-110 active:scale-120", // Interactive feedback
      "h-5 w-5 min-h-[20px] min-w-[20px]", // Enhanced touch target
      "shadow-md hover:shadow-lg", // Professional depth
      "z-10 relative" // Ensure handle is on top
    )} />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
