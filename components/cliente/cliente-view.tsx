'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'

import { MenuView } from './menu-view'
import { CartView } from './cart-view'
import { OrderStatusView } from './order-status-view'
import { ItemDetailView } from './item-detail-view'
import { BillView } from './bill-view'
import { ClienteBottomNav } from './cliente-bottom-nav'
import { TableSessionBar } from './table-session-bar'
import { PersistentOrderBar } from './persistent-order-bar'
import { WaiterCallDialog } from './waiter-call-dialog'
import { RewardsSheet } from './rewards-sheet'

import type { MenuItem } from '@/lib/store'
import type { ClienteUser } from '@/lib/cliente-auth'
import { ExternalLink, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { cn } from '@/lib/utils'

const GOOGLE_REVIEW_URL_FALLBACK = 'https://g.page/r/review/write'

/* =======================
   TYPES
======================= */
type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'bill' | 'feedback'

interface ClienteViewProps {
  mesa: number
  onBack: () => void
  clienteUser?: ClienteUser | null
}

/* =======================
   FEEDBACK SCREEN
======================= */
function FeedbackScreen({ onFinish, sessionId, mesa }: { onFinish: () => void; sessionId: string; mesa: number }) {
  const { config, addFeedback } = useApp()
  const googleReviewUrl = config.googleReviewUrl || GOOGLE_REVIEW_URL_FALLBACK
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const labels: Record<number, string> = {
    1: 'Muy malo',
    2: 'Malo',
    3: 'Regular',
    4: 'Bueno',
    5: 'Excelente',
  }

  const handleSubmit = async () => {
    if (isSubmitting || rating === 0) return
    setIsSubmitting(true)
    try {
      await addFeedback(mesa, rating, comment, sessionId)
    } finally {
      setSubmitted(true)
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <div>
            <h2 className="text-xl font-bold text-foreground">¡Gracias!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tu opinión nos ayuda a mejorar cada día.
            </p>
          </div>
          {rating >= 4 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                ¿Te animás a dejarnos una reseña en Google?
              </p>
              <Button
                className="w-full bg-foreground hover:bg-foreground/90 text-background h-11 text-sm font-bold rounded-xl gap-2"
                onClick={() => window.open(googleReviewUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Reseñar en Google
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={onFinish}
          >
            Finalizar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <h2 className="text-xl font-bold text-foreground mt-4">¿Cómo estuvo tu experiencia?</h2>
          <p className="text-sm text-muted-foreground mt-1">Tu opinión es muy importante para nosotros</p>
        </div>

        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={cn(
                  'h-10 w-10 transition-colors',
                  (hovered || rating) >= star
                    ? 'fill-foreground text-foreground'
                    : 'text-border'
                )}
              />
            </button>
          ))}
        </div>

        <div className="text-center h-5">
          {(hovered || rating) > 0 && (
            <p className="text-sm font-semibold text-foreground">
              {labels[hovered || rating]}
            </p>
          )}
        </div>

        {rating > 0 && (
          <div>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={
                rating >= 4
                  ? '¿Qué fue lo que más te gustó?'
                  : '¿Qué podríamos mejorar?'
              }
              rows={3}
              className="text-sm p-3"
            />
          </div>
        )}

        <div className="space-y-2">
          <Button
            disabled={rating === 0 || isSubmitting}
            className="w-full bg-foreground hover:bg-foreground/90 text-background h-11 text-sm font-bold rounded-xl disabled:opacity-40"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar opinión'}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={onFinish}
          >
            Omitir
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =======================
   COMPONENT
======================= */
export function ClienteView({ mesa, onBack, clienteUser }: ClienteViewProps) {
  const {
    orders,
    cart,
    tableSessions,
    createTableSession,
    getTableSession,
    waiterCalls,
    addLoyaltyPoints,
    config,
  } = useApp()

  const [screen, setScreen] = useState<ClienteScreen>('menu')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showWaiterCall, setShowWaiterCall] = useState(false)
  const [showRewards, setShowRewards] = useState(false)
  const [loyaltyPhone, setLoyaltyPhone] = useState('')

  /* =======================
     SESSION
  ======================= */
  useEffect(() => {
    const existingSession = getTableSession(mesa)
    if (!existingSession) {
      createTableSession(mesa)
    }
  }, [mesa, getTableSession, createTableSession])

  const session = tableSessions.find(s => s.mesa === mesa && s.activa)
  const sessionId = session?.id ?? ''

  /* =======================
     DETECT SESSION CLOSED BY MESERO
  ======================= */
  useEffect(() => {
    if (!session && screen !== 'feedback') {
      const closedSession = tableSessions.find(
        s => s.mesa === mesa && !s.activa && s.billStatus === 'cerrada'
      )
      if (closedSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-navigating to feedback when session closes, intentional reactive navigation
        setScreen('feedback')
      }
    }
  }, [session, mesa, tableSessions, screen])

  useEffect(() => {
    if (session?.billStatus === 'pagada') {
      const activeOrders = (session.orders || []).filter(
        o => o.status !== 'entregado' && o.status !== 'cancelado'
      )
      if (activeOrders.length === 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-navigating to feedback after payment, intentional reactive navigation
        setScreen('feedback')
      }
    }
  }, [session])

  /* =======================
     DERIVED STATE
  ======================= */
  const tableOrders = orders.filter(
    o => o.mesa === mesa && o.status !== 'entregado' && o.status !== 'cancelado'
  )

  const cartSubtotal = cart.reduce((sum, item) => {
    const extrasTotal = item.extras?.reduce((e, ex) => e + ex.precio, 0) || 0
    return sum + (item.menuItem.precio + extrasTotal) * item.cantidad
  }, 0)

  const canOrder = !session || session.billStatus === 'abierta'

  const hasActiveWaiterCall = waiterCalls.some(
    c => c.mesa === mesa && !c.atendido
  )

  // Screens that show the persistent bar + bottom nav
  const showChrome = ['menu', 'status', 'bill'].includes(screen)
  // Only menu + status get the bottom nav tabs; bill has its own bottom action
  const showBottomNav = ['menu', 'status'].includes(screen)

  /* =======================
     NAV HANDLERS
  ======================= */
  const goMenu = () => setScreen('menu')

  const handleSelectItem = (item: MenuItem) => {
    if (!canOrder) return
    setSelectedItem(item)
    setScreen('item')
  }

  const handleFinishFeedback = () => {
    onBack()
  }

  /* =======================
     RENDER SCREEN
  ======================= */
  const renderScreen = () => {
    switch (screen) {
      case 'feedback':
        return <FeedbackScreen onFinish={handleFinishFeedback} sessionId={sessionId} mesa={mesa} />

      case 'item':
        return selectedItem ? (
          <ItemDetailView
            item={selectedItem}
            onBack={goMenu}
            onAddToCart={goMenu}
            cartItemCount={cart.length}
            canOrder={canOrder}
          />
        ) : null

      case 'cart':
        return (
          <CartView
            mesa={mesa}
            onBack={goMenu}
            onOrderConfirmed={(subtotal) => {
              if (loyaltyPhone) {
                addLoyaltyPoints(loyaltyPhone, subtotal, session?.id)
              }
              setScreen('status')
            }}
            loyaltyPhone={loyaltyPhone}
            onSetLoyaltyPhone={setLoyaltyPhone}
          />
        )

      case 'status':
        return (
          <OrderStatusView
            orders={tableOrders}
            mesa={mesa}
            onBack={goMenu}
          />
        )

      case 'bill':
        return session ? (
          <BillView
            sessionId={sessionId}
            mesa={mesa}
            onBack={goMenu}
            onShowRewards={() => setShowRewards(true)}
          />
        ) : null

      default:
        return (
          <MenuView
            mesa={mesa}
            onSelectItem={handleSelectItem}
            onGoToCart={() => setScreen('cart')}
            cartItemCount={cart.length}
            hasActiveOrders={tableOrders.length > 0}
            onViewStatus={() => setScreen('status')}
            onExit={onBack}
            canOrder={canOrder}
          />
        )
    }
  }

  /* =======================
     JSX
  ======================= */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Persistent session context bar — visible on menu/status/bill */}
      {showChrome && (
        <TableSessionBar
          mesa={mesa}
          restaurantName={config.restaurantName}
          logoUrl={config.logoUrl}
          session={session}
          activeOrderCount={tableOrders.length}
          cartCount={cart.length}
          onViewBill={session ? () => setScreen('bill') : undefined}
        />
      )}

      {/* User greeting strip — shown when logged in */}
      {clienteUser && showChrome && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/50 border-b border-border">
          <span className="text-xs text-muted-foreground">
            Hola, <span className="font-semibold text-foreground">{clienteUser.nombre}</span>
          </span>
        </div>
      )}

      <div className={showBottomNav ? 'pb-16' : ''}>
        {renderScreen()}
      </div>

      {/* Persistent bottom action bar — menu and status screens */}
      {showBottomNav && (
        <PersistentOrderBar
          cartCount={cart.length}
          cartSubtotal={cartSubtotal}
          activeOrderCount={tableOrders.length}
          session={session}
          canOrder={canOrder}
          onViewCart={() => setScreen('cart')}
          onViewStatus={() => setScreen('status')}
          onViewBill={() => setScreen('bill')}
        />
      )}

      {/* Bottom nav tabs */}
      {showBottomNav && (
        <ClienteBottomNav
          activeScreen={screen}
          onMenuClick={() => setScreen('menu')}
          onStatusClick={() => setScreen('status')}
          onBillClick={() => setScreen('bill')}
          onCallWaiter={() => setShowWaiterCall(true)}
          hasActiveOrders={tableOrders.length > 0}
          cartCount={cart.length}
          hasActiveWaiterCall={hasActiveWaiterCall}
          hasSession={!!session}
        />
      )}

      {showWaiterCall && (
        <WaiterCallDialog
          mesa={mesa}
          onClose={() => setShowWaiterCall(false)}
        />
      )}

      {showRewards && (
        <RewardsSheet
          sessionId={sessionId}
          onClose={() => setShowRewards(false)}
        />
      )}

      {config.poweredByWaitless === true && (
        <div className="text-center py-2 text-[10px] text-muted-foreground">
          Powered by WAITLESS
        </div>
      )}
    </div>
  )
}
