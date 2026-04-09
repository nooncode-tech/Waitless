# Branding Policy — WAITLESS V10

Define las reglas exactas de qué marca se muestra, cuándo, y bajo qué condiciones.

---

## Capas de marca

| Capa | Qué es | Quién la controla |
|---|---|---|
| **Marca del tenant** | Nombre, logo, colores, tipografía del restaurante | El tenant, vía tabla `tenants` en Supabase |
| **Powered by WAITLESS** | Texto/badge "Powered by WAITLESS" | El tenant, vía campo `powered_by_waitless` (opt-in) |
| **Marca WAITLESS interna** | Nombre "WAITLESS" en UI de staff, admin, KDS | Hardcoded — no expuesto al cliente final |

---

## Reglas por superficie

### Vista de cliente (QR / mesa)

- Logo: se muestra el logo del tenant si `logoUrl` está configurado. Si no, se muestra la **inicial del nombre del restaurante** (p.ej. "L" para "La Trattoria").
- Nombre del restaurante: siempre desde `config.restaurantName`.
- "Powered by WAITLESS": solo si `config.poweredByWaitless === true` (opt-in estricto). Si es `false`, `undefined`, o no está, **no aparece**.
- Colores: siempre los colores del tenant (`primaryColor`, `secondaryColor`, `accentColor`).

### Recibo impreso (customer-receipt)

- Nombre del restaurante: desde `config.restaurantName`.
- "Powered by WAITLESS": solo si `poweredByWaitless === true`.

### Vista de staff (mesero, cocina, admin)

- Usa `config.restaurantName ?? ''` en títulos. Nunca cae a "WAITLESS".
- Los iconos/UI de staff no muestran branding de WAITLESS al cliente final.

### Login screen

- Logo: muestra el logo del tenant si está configurado. Fallback: inicial del restaurante.
- Color del panel izquierdo: `primaryColor` del tenant.
- Footer: `{restaurantName} · Plataforma operativa para restaurantes`. No dice "WAITLESS".

---

## Componente WaitlessLogo

```
imageUrl presente       → <img> con el logo del tenant
imageUrl ausente        → SVG con la inicial del nombre del restaurante (imageAlt)
imageAlt ausente/vacío  → SVG con "?"
```

El componente nunca muestra la "W" de WAITLESS para tenants con branding propio.

---

## Campo `powered_by_waitless`

- Tipo: `boolean`
- Default en DB: `false` (o `null`, tratado como `false`)
- Evaluación en código: siempre `=== true` (comparación estricta)
- Controla: texto "Powered by WAITLESS" en cliente-view y customer-receipt únicamente

---

## Regla general

> **La marca WAITLESS no debe ser visible al usuario final del restaurante a menos que el tenant haya activado explícitamente `poweredByWaitless = true`.**

La única excepción son las URLs y la infraestructura técnica (Supabase, Vercel), que son invisibles al usuario final.
