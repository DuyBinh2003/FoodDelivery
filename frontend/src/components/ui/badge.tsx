import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/30 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-primary/15 text-orange-400 border-primary/25 [a]:hover:bg-primary/25",
        secondary:
          "bg-secondary text-secondary-foreground border-white/[0.06] [a]:hover:bg-white/[0.08]",
        destructive:
          "bg-destructive/15 text-red-400 border-destructive/25 [a]:hover:bg-destructive/25",
        outline:
          "border-border text-zinc-300 [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
