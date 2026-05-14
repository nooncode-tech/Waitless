'use client'

import React, { useState } from 'react'
import { Plus, Edit2, User, Shield, ChefHat, UserCheck, Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { User as UserType, UserRole } from '@/lib/store'

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  admin:      { label: 'Administrador', icon: <Shield className="h-3.5 w-3.5" />,    bg: 'bg-gray-900',   text: 'text-white' },
  manager:    { label: 'Manager',       icon: <User className="h-3.5 w-3.5" />,      bg: 'bg-purple-600', text: 'text-white' },
  mesero:     { label: 'Mesero',        icon: <UserCheck className="h-3.5 w-3.5" />, bg: 'bg-amber-500',  text: 'text-white' },
  cocina:     { label: 'Cocina',        icon: <ChefHat className="h-3.5 w-3.5" />,   bg: 'bg-[#06C167]',  text: 'text-white' },
  repartidor: { label: 'Repartidor',    icon: <User className="h-3.5 w-3.5" />,      bg: 'bg-blue-600',   text: 'text-white' },
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function callUsersApi(
  method: 'POST' | 'PUT' | 'DELETE',
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; profile?: UserType }> {
  const token = await getToken()
  if (!token) return { ok: false, error: 'No hay sesión activa' }

  const res = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) return { ok: false, error: json.error ?? 'Error desconocido' }
  return { ok: true, profile: json.profile }
}

export function UsersManager() {
  const { users, refreshUsers, currentUser } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleActive = async (user: UserType) => {
    if (user.id === currentUser?.id) return
    setTogglingId(user.id)
    const result = await callUsersApi('PUT', { userId: user.id, updates: { activo: !user.activo } })
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
      const updates: Record<string, unknown> = {}
      if (userData.nombre)   updates.nombre = userData.nombre
      if (userData.role)     updates.role   = userData.role
      if (userData.password) updates.password = userData.password

      const result = await callUsersApi('PUT', { userId: editingUser.id, updates })
      if (!result.ok) throw new Error(result.error ?? 'Error al actualizar')
      await refreshUsers()
      toast.success('Usuario actualizado')
    } else {
      const result = await callUsersApi('POST', {
        username: userData.username,
        password: userData.password,
        nombre:   userData.nombre,
        role:     userData.role,
      })
      if (!result.ok) throw new Error(result.error ?? 'Error al crear usuario')
      await refreshUsers()
      toast.success(`Usuario @${userData.username} creado`)
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
    <div style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
          const count = users.filter(u => u.role === role && u.activo).length
          const cfg = ROLE_CONFIG[role]
          return (
            <div key={role} className="border border-gray-100 rounded-2xl p-3 bg-white text-center">
              <p className="text-xl font-black text-gray-900">{count}</p>
              <p className="text-[9px] text-gray-400 truncate">{cfg.label}s</p>
            </div>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-black text-gray-900">Gestión de usuarios</h2>
          <p className="text-[10px] text-gray-400">
            {users.filter(u => u.activo).length} usuario{users.filter(u => u.activo).length !== 1 ? 's' : ''} activo{users.filter(u => u.activo).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="h-3 w-3" />Agregar
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {users.map((user) => {
          const cfg = ROLE_CONFIG[user.role]
          const isCurrentUser = user.id === currentUser?.id
          const isToggling = togglingId === user.id

          return (
            <div
              key={user.id}
              className={`border rounded-2xl p-3 bg-white transition-opacity ${!user.activo ? 'opacity-50' : ''} ${isCurrentUser ? 'border-gray-900' : 'border-gray-100'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs text-gray-900">{user.nombre}</h4>
                      {isCurrentUser && (
                        <span className="text-[8px] border border-gray-300 text-gray-500 rounded-full px-1.5 py-0.5">Tú</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                  <div className="flex items-center">
                    {isToggling ? (
                      <Spinner className="size-3 text-gray-400" />
                    ) : (
                      <Switch
                        checked={user.activo}
                        onCheckedChange={() => handleToggleActive(user)}
                        disabled={isCurrentUser || isToggling}
                        className="scale-[0.6]"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setEditingUser(user)}
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(showAddDialog || editingUser) && (
        <UserDialog
          user={editingUser}
          onClose={() => { setShowAddDialog(false); setEditingUser(null) }}
          onSave={handleSave}
          onDelete={editingUser && editingUser.id !== currentUser?.id ? () => handleDelete(editingUser.id) : undefined}
        />
      )}
    </div>
  )
}

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
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900">
            {user ? 'Editar usuario' : 'Agregar usuario'}
          </h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <div>
            <Label className="text-xs text-gray-500">Nombre completo</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan Perez" className="h-9 text-sm mt-1" disabled={loading} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Usuario</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="juanperez" className="h-9 text-sm mt-1" disabled={loading || !!user} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Contraseña {user && '(dejar vacío para mantener)'}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="h-9 text-sm mt-1" disabled={loading} />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={loading}>
              <SelectTrigger className="h-9 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-1.5">
                      {ROLE_CONFIG[r].icon}
                      {ROLE_CONFIG[r].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          {onDelete && (
            <button
              className="h-9 px-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs flex items-center gap-1 disabled:opacity-50"
              onClick={onDelete}
              disabled={loading}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-50" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading || !nombre.trim() || !username.trim() || (!user && !password.trim())}
          >
            {loading ? <Spinner className="size-3.5" /> : user ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}
