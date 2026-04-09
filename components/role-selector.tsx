'use client'

import React from "react"
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { ChefHat, ClipboardList, Settings, Utensils, ChevronRight, QrCode } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Role {
  id: string
  nombre: string
  descripcion: string
  icon: React.ReactNode
}

const ROLES: Role[] = [
  {
    id: 'cliente',
    nombre: 'Guest / Cliente',
    descripcion: 'Acceso por QR — menú, pedido y cuenta',
    icon: <QrCode className="h-4 w-4" />,
  },
  {
    id: 'admin',
    nombre: 'Owner / Admin',
    descripcion: 'Panel completo, analítica y configuración',
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: 'mesero',
    nombre: 'Sala / Waiter',
    descripcion: 'Mesas, sesiones, pedidos y entregas',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    id: 'cocina_a',
    nombre: 'Kitchen A',
    descripcion: 'KDS — Estación principal',
    icon: <ChefHat className="h-4 w-4" />,
  },
  {
    id: 'cocina_b',
    nombre: 'Kitchen B',
    descripcion: 'KDS — Estación secundaria',
    icon: <Utensils className="h-4 w-4" />,
  },
]

interface RoleSelectorProps {
  onSelectRole: (roleId: string) => void
  /** URL del logo del tenant. Si se provee, reemplaza el logo por defecto. */
  logoUrl?: string
  /** Nombre del restaurante / tenant para accessibility y branding. */
  restaurantName?: string
  /** Color primario del tenant para el logo fallback. */
  primaryColor?: string
}

export function RoleSelector({ onSelectRole, logoUrl, restaurantName, primaryColor }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <WaitlessLogo size={48} color="dark" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} primaryColor={primaryColor} />
          <p className="text-muted-foreground text-[10px] tracking-widest uppercase mt-2">
            Plataforma operativa
          </p>
        </div>
      </header>

      {/* Role Selection */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xs font-medium text-muted-foreground mb-3 text-center">
            Selecciona tu rol para continuar
          </h2>
          
          <div className="space-y-1.5">
            {ROLES.map((role) => (
              <Card
                key={role.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 border border-border bg-card"
                onClick={() => onSelectRole(role.id)}
              >
                <CardContent className="flex items-center gap-3 p-2.5">
                  <div className="flex-shrink-0 w-8 h-8 bg-black/8 rounded-md flex items-center justify-center text-black">
                    {role.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-foreground">
                      {role.nombre}
                    </h3>
                    <p className="text-muted-foreground text-[10px] leading-tight">
                      {role.descripcion}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-2">
        <p className="text-center text-[10px] text-muted-foreground">
          {restaurantName ?? 'Sistema de gestión de pedidos'}
        </p>
      </footer>
    </div>
  )
}
