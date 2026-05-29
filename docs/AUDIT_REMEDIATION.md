# Remediación — Auditoría Técnica Total V10

Registro del estado de los 7 hallazgos **críticos** de la auditoría.

| # | Hallazgo | Estado | Cómo se cerró |
|---|---|---|---|
| 1 | SEC-2 — Monto de reembolso de disputa no validado vs total de orden | ✅ Cerrado | Validación server-side del monto contra el total de la orden |
| 2 | SEC-3 — Doble gasto en wallet (operaciones no atómicas) | ✅ Cerrado | RPC atómica `wallet_apply_delta` (evita lost-update) |
| 3 | SEC-1 / DB-3 — RLS anon insert inseguro + `app_config` público | ✅ Cerrado | Migraciones de RLS + scoping por tenant |
| 4 | DB-1 / DB-2 — DB no reproducible + tablas y RPCs faltantes | ✅ Cerrado | 4 migraciones (`20260529000001`–`4`) + `schema_completo.sql` |
| 5 | Liquidaciones Stripe — idempotencyKey + cálculo duplicado | ⏸️ Moot | Stripe no se usa en el lanzamiento (no disponible en el país). Reabrir solo si se habilita Stripe |
| 6 | SEC-4 — Rate-limit en memoria (inútil en serverless) | ✅ Cerrado | `lib/rate-limit.ts` → Upstash Redis vía REST, con fallback a memoria |
| 7 | FE-1 / FE-2 — God-context sin memo → re-render global | ⏸️ **Diferido** | Ver abajo |

---

## FE-1 / FE-2 — Diferido (decisión consciente)

**Hallazgo:** `lib/context.tsx` (~1.237 LOC) expone un único `AppContext` con 24 slices
de estado + ~40 acciones, consumido por 54 componentes. El objeto `value` se reconstruye
en cada render sin `useMemo`, así que cualquier `setState` (o evento de los 9 canales
realtime) re-renderiza a los 54 consumidores.

**Por qué se difiere en vez de arreglarse antes del lanzamiento:**

1. **El fix "seguro" no mueve la aguja en este código.** Envolver `value` en `useMemo`
   no evita los re-renders porque `...state` está dentro de `value`: cualquier cambio de
   estado invalida el memo igual. Un `AppActionsContext` verdaderamente estable exigiría
   reescribir los 7 hooks de acciones (`useOrderActions`, `useSessionActions`, etc.) con un
   `stateRef`, porque hoy leen `state.*` directo y sus callbacks cambian de identidad en
   cada render. Eso toca la lógica de **pedidos, sesiones y pagos** — el flujo de dinero que
   la propia auditoría marca como crítico — con **riesgo de regresión real**.

2. **El payoff de ese fix seguro es ~cero hoy.** De los 54 consumidores, solo 4 son
   "action-only" (no leen estado): `waiter-call-dialog`, `item-detail-view`,
   `order-status-view`, `edit-order-dialog`. Los 4 son **diálogos** que están desmontados
   la mayor parte del tiempo, así que su costo de re-render ya es cero. El resto de los
   consumidores leen estado y **deben** re-renderizar cuando su dato cambia.

3. **El fix que sí reduce re-renders es alto riesgo.** La tormenta real (un evento de
   `orders` re-renderiza la pantalla de `config`, el editor de `menu`, etc.) solo se corrige
   migrando los consumidores a suscripciones por slice — es decir, un store con selectores
   (Zustand / `useSyncExternalStore`) o un split de contextos por dominio. Eso toca los 54
   consumidores: alto esfuerzo y alto riesgo, justo antes del lanzamiento.

**Decisión:** No es production-blocking (es performance/mantenibilidad, no corrección ni
seguridad). Se difiere a **post-lanzamiento**, cuando haya margen de testing para una
migración a store con selectores.

**Trabajo concreto recomendado cuando se retome:**
- Migrar `AppContext` a un store con selectores (`useSyncExternalStore` nativo o Zustand).
- Cada componente se suscribe solo a los slices que lee → re-render quirúrgico.
- Migrar consumidores de forma incremental, con tests de regresión por pantalla.
- Empezar por las pantallas de mayor churn realtime (KDS, mesero, expo, órdenes).
