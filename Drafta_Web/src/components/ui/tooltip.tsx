"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const TouchTooltipContext = React.createContext<(() => void) | null>(null)

const Tooltip = ({ children, open, defaultOpen, onOpenChange, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) => {
  const [hoverOpen, setHoverOpen] = React.useState(defaultOpen ?? false)
  const [touchOpen, setTouchOpen] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTouch = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setTouchOpen(false)
  }, [])
  React.useEffect(() => {
    if (!touchOpen) return
    document.addEventListener('pointerdown', dismissTouch, true)
    document.addEventListener('scroll', dismissTouch, true)
    return () => {
      document.removeEventListener('pointerdown', dismissTouch, true)
      document.removeEventListener('scroll', dismissTouch, true)
    }
  }, [touchOpen, dismissTouch])
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const showTouch = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setHoverOpen(false)
    setTouchOpen(true)
    timer.current = setTimeout(() => setTouchOpen(false), 1500)
  }, [])
  return (
    <TouchTooltipContext.Provider value={showTouch}>
      <TooltipPrimitive.Root {...props} open={touchOpen || (open ?? hoverOpen)} onOpenChange={(next) => {
        setHoverOpen(next)
        onOpenChange?.(next)
      }}>{children}</TooltipPrimitive.Root>
    </TouchTooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, asChild, onPointerUp, ...props }, ref) => {
  const showTouch = React.useContext(TouchTooltipContext)
  const disabledChild = asChild && React.isValidElement<{ disabled?: boolean }>(children) && children.props.disabled
  return (
    <TooltipPrimitive.Trigger ref={ref} asChild={asChild} {...props} onPointerUp={(event) => {
      onPointerUp?.(event)
      // A menu/popover already explains its trigger; do not compete with its focus layer.
      if (!event.defaultPrevented && event.pointerType === 'touch' && !event.currentTarget.hasAttribute('aria-haspopup')) showTouch?.()
    }}>
      {disabledChild ? <span className="inline-flex" tabIndex={0}>{children}</span> : children}
    </TooltipPrimitive.Trigger>
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
