import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gesti-verde/15 text-gesti-teal',
        borrador: 'bg-gray-100 text-gray-600',
        generado: 'bg-gesti-amarillo/20 text-yellow-700',
        enviado: 'bg-gesti-verde/15 text-gesti-teal',
        firmado: 'bg-gesti-verde/25 text-green-700',
        activo: 'bg-gesti-verde text-white font-semibold',
        terminado: 'bg-gesti-dark/10 text-gesti-dark',
        destructive: 'bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
