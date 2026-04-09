'use client'

import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  onClick: () => void
  label?: string
  variant?: 'default' | 'light'
}

export function BackButton({ onClick, label = 'Volver', variant = 'default' }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`gap-1 -ml-2 ${
        variant === 'light'
          ? 'text-background hover:text-background/80 hover:bg-background/10'
          : 'text-foreground hover:text-primary hover:bg-primary/5'
      }`}
    >
      <ChevronLeft className="h-5 w-5" />
      <span>{label}</span>
    </Button>
  )
}
