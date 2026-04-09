'use client'

// P2-5: Reusable empty state component with optional action button

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 px-6 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <span className="text-4xl opacity-40" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 text-xs font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
