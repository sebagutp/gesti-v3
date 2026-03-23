'use client'

import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface Stat {
  label: string
  value: string | number
  icon: ReactNode
  color?: 'verde' | 'teal' | 'amarillo'
}

interface StatsCardsProps {
  stats: Stat[]
}

const colorMap = {
  verde: 'bg-gesti-verde/10 text-gesti-verde',
  teal: 'bg-gesti-teal/10 text-gesti-teal',
  amarillo: 'bg-gesti-amarillo/20 text-yellow-600',
} as const

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const color = stat.color ?? 'teal'
        return (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn('flex items-center justify-center h-11 w-11 rounded-lg', colorMap[color])}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 truncate">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gesti-dark">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
