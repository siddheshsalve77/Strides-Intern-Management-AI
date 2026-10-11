import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "press-tactile inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-semibold tracking-[-0.006em] transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Premium gradient primary — teal→emerald, soft glow, tactile press
        default: "btn-gradient-primary",
        // Sophisticated coral/red treatment
        destructive: "btn-gradient-danger",
        outline:
          "border border-input bg-background/70 shadow-xs backdrop-blur-sm hover:border-primary/25 hover:bg-accent/60 hover:text-accent-foreground active:scale-[0.98] dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "border border-border/60 bg-secondary/80 text-secondary-foreground shadow-xs backdrop-blur-sm hover:border-border hover:bg-secondary active:scale-[0.98]",
        ghost:
          "hover:bg-accent/70 hover:text-accent-foreground active:scale-[0.98] dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        // New premium variants — additive, opt-in
        gradient: "btn-gradient-primary",
        ai: "btn-gradient-ai",
        success: "btn-gradient-success",
        glass: "btn-glass",
        warm: "btn-gradient-warm",
        violet: "btn-gradient-violet",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        xl: "h-11 rounded-lg px-7 text-sm has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
