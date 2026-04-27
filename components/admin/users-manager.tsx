'use client'

import React, { useState } from 'react'
import { Plus, Edit2, User, Shield, ChefHat, UserCheck, Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { User as UserType, UserRole } from '@/lib/store'

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin:    { label: 'Administrador', icon: <Shield className="h-3.5 w-3.5" />,    color: 'bg-primary text-primary-foreground' },
  manager:  { label: 'Manager',       icon: <User className="h-3.5 w-3.5" />,      color: 'bg-purple-600 text-white' },
  mesero:   { label: 'Mesero',        icon: <UserCheck className="h-3.5 w-3.5" />, color: 'bg-amber-500 text-white' },
  cocina:   { label: 'Cocina',         icon: <ChefHat className="h-3.5 w-3.5" />,   color: 'bg-success text-success-foreground' },
}

// ── Helper: obtiene el token del usuario actual ───────────────────────────────
async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// ── Helper: llama al API con autenticación ────────────────────────────────────
async function callUsersApi(
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; profile?: UserType }> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'No hay sesión activa' }

  const res = await fetch('/api/admin/users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) return { ok: false, error: json.error ?? 'Error desconocido' }
  return { ok: true, profile: json.profile }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function UsersManager() {
  const { users, refreshUsers, currentUser } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleActive = async (user: UserType) => {
    if (user.id === currentUser?.id) return
    setTogglingId(user.id)
    const result = await callUsersApi('PUT', {
      userId: user.id,
      updates: { activo: !user.activo },
    })
    if (result.ok) {
      await refreshUsers()
      toast.success(`Usuario ${user.nombre} ${!user.activo ? 'activado' : 'desactivado'}`)
    } else {
      toast.error(result.error ?? 'No se pudo actualizar el usuario')
    }
    setTogglingId(null)
  }

  const handleSave = async (userData: Partial<UserType> & { password?: string }) => {
    if (editingUser) {
      // Actualizar usuario existente
      const updates: Record<string, unknown> = {}
      if (userData.nombre)   updates.nombre = userData.nombre
      if (userData.role)     updates.role   = userData.role
      if (userData.password) updates.password = userData.password

      const result = await callUsersApi('PUT', { userId: editingUser.id, updates })
      if (result.ok) {
        await refreshUsers()
        toast.success('Usuario actualizado')
      } else {
        toast.error(result.error ?? 'Error al actualizar')
        return // no cerrar el dialog si falló
      }
    } else {
      // Crear nuevo usuario
      const result = await callUsersApi('POST', {
        username: userData.username,
        password: userData.password,
        nombre:   userData.nombre,
        role:     userData.role,
      })
      if (result.ok) {
        await refreshUsers()
        toast.success(`Usuario @${userData.username} creado`)
      } else {
        toast.error(result.error ?? 'Error al crear usuario')
        return
      }
    }

    setShowAddDialog(false)
    setEditingUser(null)
  }

  const handleDelete = async (userId: string) => {
    const result = await callUsersApi('DELETE', { userId })
    if (result.ok) {
      await refreshUsers()
      toast.success('Usuario eliminado')
      setEditingUser(null)
    } else {
      toast.error(result.error ?? 'Error al eliminar usuario')
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
          const count = users.filter(u => u.role === role && u.activo).length
          const config = ROLE_CONFIG[role]
          return (
            <Card key={role}>
              <CardContent className="p-2 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[9px] text-muted-foreground truncate">{config.label}s</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Gestión de usuarios</h2>
          <p className="text-[10px] text-muted-foreground">
            {users.filter(u => u.activo).length} usuario{users.filter(u => u.activo).length !== 1 ? 's' : ''} activo{users.filter(u => u.activo).length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          size="xs"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-1.5">
        {users.map((user) => {
          const roleConfig = ROLE_CONFIG[user.role]
          const isCurrentUser = user.id === currentUser?.id
          const isToggling = togglingId === user.id

          return (
            <Card
              key={user.id}
              className={`border ${!user.activo ? 'opacity-50' : ''} ${isCurrentUser ? 'border-primary' : ''}`}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${roleConfig.color} flex items-center justify-center`}>
                      {roleConfig.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-medium text-xs text-foreground">{user.nombre}</h4>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1">Tu</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] h-4 ${roleConfig.color}`}>
                      {roleConfig.label}
                    </Badge>

                    <div className="flex items-center gap-1">
                      {isToggling ? (
                        <Spinner className="size-3 text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={user.activo}
                          onCheckedChange={() => handleToggleActive(user)}
                          disabled={isCurrentUser || isToggling}
                          className="scale-[0.6]"
                        />
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(user)}
                      className="h-6 w-6"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || editingUser) && (
        <UserDialog
          user={editingUser}
          onClose={() => {
            setShowAddDialog(false)
            setEditingUser(null)
          }}
          onSave={handleSave}
          onDelete={
            editingUser && editingUser.id !== currentUser?.id
              ? () => handleDelete(editingUser.id)
              : undefined
          }
        />
      )}
    </div>
  )
}

// ── Dialog de creación/edición ────────────────────────────────────────────────
interface UserDialogProps {
  user: UserType | null
  onClose: () => void
  onSave: (userData: Partial<UserType> & { password?: string }) => Promise<void>
  onDelete?: () => void
}

function UserDialog({ user, onClose, onSave, onDelete }: UserDialogProps) {
  const [nombre, setNombre]     = useState(user?.nombre || '')
  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<UserRole>(user?.role || 'mesero')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!nombre.trim() || !username.trim() || (!user && !password.trim())) return
    setError(null)
    setLoading(true)
    try {
      await onSave({
        nombre:   nombre.trim(),
        username: username.trim(),
        role,
        ...(password.trim() ? { password: password.trim() } : {}),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">
            {user ? 'Editar usuario' : 'Agregar usuario'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <Label className="text-xs">Nombre completo</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Perez"
              className="h-9 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-xs">Usuario</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="juanperez"
              className="h-9 text-sm"
              disabled={loading || !!user}
            />
          </div>

          <div>
            <Label className="text-xs">
              Contraseña {user && '(dejar vacío para mantener)'}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="h-9 text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <Label className="text-xs">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={loading}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => {
                  const config = ROLE_CONFIG[r]
                  return (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-1.5">
                        {config.icon}
                        {config.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            {onDelete && (
              <Button
                variant="outline"
                className="h-9 text-xs text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                onClick={onDelete}
                disabled={loading}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button variant="outline" className="flex-1 h-9 text-xs bg-transparent" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 h-9 text-xs bg-primary"
              onClick={handleSubmit}
              disabled={loading || !nombre.trim() || !username.trim() || (!user && !password.trim())}
            >
              {loading ? <Spinner className="size-3.5" /> : user ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
