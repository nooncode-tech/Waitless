'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'

import { MenuView } from './menu-view'
import { CartView } from './cart-view'
import { OrderStatusView } from './order-status-view'
import { ItemDetailView } from './item-detail-view'
import { ClienteBottomNav } from './cliente-bottom-nav'
import { WaiterCallDialog } from './waiter-call-dialog'
import { RewardsSheet } from './rewards-sheet'

import type { MenuItem } from '@/lib/store'
import type { ClienteUser } from '@/lib/cliente-auth'
import { ExternalLink, Star, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WaitlessLogo } from '@/components/ui/waitless-logo'
import { cn } from '@/lib/utils'

const GOOGLE_REVIEW_URL_FALLBACK = 'https://g.page/r/review/write'

/* =======================
   TYPES
======================= */
type ClienteScreen = 'menu' | 'item' | 'cart' | 'status' | 'feedback'

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
      // Task 2.5: usar addFeedback del contexto (soporta offline queue)
      await addFeedback(mesa, rating, comment, sessionId)
    } finally {
      setSubmitted(true)
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <div>
            <h2 className="text-xl font-bold text-black">¡Gracias!</h2>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Tu opinión nos ayuda a mejorar cada día.
            </p>
          </div>
          {rating >= 4 && (
            <div className="space-y-3">
              <p className="text-xs text-[#6B6B6B]">
                ¿Te animás a dejarnos una reseña en Google?
              </p>
              <Button
                className="w-full bg-black hover:bg-black/90 text-white h-11 text-sm font-bold rounded-xl gap-2"
                onClick={() => window.open(googleReviewUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Reseñar en Google
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full text-[#BEBEBE] text-sm"
            onClick={onFinish}
          >
            Finalizar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <WaitlessLogo size={48} color="dark" imageUrl={config.logoUrl} imageAlt={config.restaurantName ?? 'Logo'} />
          <h2 className="text-xl font-bold text-black mt-4">¿Cómo estuvo tu experiencia?</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">Tu opinión es muy importante para nosotros</p>
        </div>

        {/* Estrellas */}
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
                    ? 'fill-black text-black'
                    : 'text-[#E5E5E5]'
                )}
              />
            </button>
          ))}
        </div>

        {/* Label de rating */}
        <div className="text-center h-5">
          {(hovered || rating) > 0 && (
            <p className="text-sm font-semibold text-black">
              {labels[hovered || rating]}
            </p>
          )}
        </div>

        {/* Comentario */}
        {rating > 0 && (
          <div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={
                rating >= 4
                  ? '¿Qué fue lo que más te gustó?'
                  : '¿Qué podríamos mejorar?'
              }
              rows={3}
              className="w-full text-sm border border-[#E5E5E5] rounded-xl p-3 resize-none text-black placeholder:text-[#BEBEBE] focus:outline-none focus:border-black transition-colors"
            />
          </div>
        )}

        <div className="space-y-2">
          <Button
            disabled={rating === 0 || isSubmitting}
            className="w-full bg-black hover:bg-black/90 text-white h-11 text-sm font-bold rounded-xl disabled:opacity-40"
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar opinión'}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-[#BEBEBE] text-sm"
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
    // If the session is no longer active (mesero closed it), show feedback
    if (!session && screen !== 'feedback') {
      // Check if there was a session before that got closed
      const closedSession = tableSessions.find(
        s => s.mesa === mesa && !s.activa && s.billStatus === 'cerrada'
      )
      if (closedSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-navigating to feedback when session closes, intentional reactive navigation
        setScreen('feedback')
      }
    }
  }, [session, mesa, tableSessions, screen])

  // If session is paid, auto-navigate to feedback when no more active orders
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

  const canOrder = !session || session.billStatus === 'abierta'

  const hasActiveWaiterCall = waiterCalls.some(
    c => c.mesa === mesa && !c.atendido
  )

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
    <div className="min-h-screen bg-white flex flex-col">
      {clienteUser && showBottomNav && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#F9F9F9] border-b border-[#F0F0F0]">
          <UserCircle2 className="h-4 w-4 text-[#BEBEBE] shrink-0" />
          <span className="text-xs text-[#6B6B6B]">
            Hola, <span className="font-semibold text-black">{clienteUser.nombre}</span>
          </span>
        </div>
      )}
      <div className={showBottomNav ? 'pb-16' : ''}>
        {renderScreen()}
      </div>

      {showBottomNav && (
        <ClienteBottomNav
          activeScreen={screen}
          onMenuClick={() => setScreen('menu')}
          onStatusClick={() => setScreen('status')}
          onCallWaiter={() => setShowWaiterCall(true)}
          hasActiveOrders={tableOrders.length > 0}
          cartCount={cart.length}
          hasActiveWaiterCall={hasActiveWaiterCall}
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
        <div className="text-center py-2 text-[10px] text-[#BEBEBE]">
          Powered by WAITLESS
        </div>
      )}
    </div>
  )
}
