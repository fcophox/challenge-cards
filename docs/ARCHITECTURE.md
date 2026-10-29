# Arquitectura

## Capas

```
src/
  data/challenges.ts        Catálogo (60 retos). Fuente única → también genera supabase/seed.sql
  lib/game/                 Motor de juego: TypeScript puro, sin React
    types.ts                Entidades del dominio
    config.ts               Rarezas, pesos, dificultades, categorías, reglas del mazo
    random.ts               PRNG determinista + selección ponderada
    deck.ts                 Reglas del mazo (elegibilidad, enfriamiento, agotamiento, ciclos)
    attempts.ts             Máquina de estados de los intentos + claves de idempotencia
    progression.ts          Niveles, saldo derivado del ledger, rachas, estadísticas
    achievements.ts         Logros y recompensas ampliables (puntos, reversos, temas)
    engine.ts               Orquestador: serializa acciones y aplica reglas sobre un repositorio
  lib/repositories/         Persistencia intercambiable (interfaz + IndexedDB)
  lib/sync/                 Sincronización opcional con Supabase
  components/
    ui/                     Primitivas estilo shadcn/ui (Radix + cva + Tailwind)
    game/                   Carta, mazo, hoja de detalle, recompensa…
    screens/                Pantallas
    layout/, providers/, pwa/
  app/                      Rutas App Router (todas estáticas)
supabase/migrations         Esquema, RLS, Storage y funciones del servidor
public/sw.js                Service worker escrito a mano
```

El motor (`lib/game`) no conoce React ni el almacenamiento concreto: recibe un `GameRepository`, el catálogo, un generador aleatorio y un reloj. React se suscribe con `useSyncExternalStore`. Así el motor se prueba en Node (`npm test`) con la misma implementación de IndexedDB que usa el navegador (vía `fake-indexeddb`).

## Decisiones clave

**Rareza ≠ dificultad ≠ puntos.** Cada reto guarda los tres campos por separado. `DEFAULT_POINTS_BY_RARITY` solo rellena el valor inicial; se puede cambiar el precio de un reto, la dificultad o el peso de una rareza sin tocar lo demás.

**Selección ponderada configurable.** `deck.drawOne` elige primero una rareza según `RARITIES[*].weight` (renormalizado entre las rarezas que aún tienen cartas elegibles) y después una carta dentro de ella, priorizando las no vistas. Los pesos viven en `config.ts`, nunca en componentes. Un test verifica la distribución con 20 000 tiradas.

**Reglas del mazo** (documentadas en `deck.ts`):
1. Elegible: disponible, no pendiente, no completada en el ciclo actual, no en la cola y no rechazada en las últimas 12 robadas.
2. Si no hay ninguna, se relaja el enfriamiento (la más antigua primero), nunca la recién rechazada.
3. Si aun así no hay cartas, el mazo se agota: el jugador puede terminar pendientes o barajar un nuevo ciclo, en el que las completadas vuelven (y vuelven a puntuar como intentos nuevos).
4. Máximo 5 retos pendientes a la vez.

**Estados.** Oculta/revelada son estado del mazo; al deslizar se crea un intento `accepted` o `rejected`. Transiciones válidas: `accepted → completed | abandoned`. Los demás estados son terminales (`attempts.ts`).

**Sin eventos duplicados.** Tres barreras: (1) un `busy` compartido bloquea gestos y botones mientras una carta anima; (2) el motor serializa todas las mutaciones en una cola y verifica que la carta siga arriba; (3) la persistencia es idempotente.

**Puntos como ledger.** El saldo nunca se guarda: se deriva de `PointsLedger`. Cada abono lleva una `idempotencyKey` única (`challenge_completed:<attemptId>`, `achievement_unlocked:<id>`) con índice único en IndexedDB y en Postgres. Completar un reto es **una transacción** que valida la transición, toma los puntos del catálogo (nunca del llamador) y escribe intento + ledger + evidencia. Aceptar no da puntos.

**Progresión.** XP = puntos ganados acumulados. Nivel L requiere `25·(L−1)·(L+2)` XP (100, 250, 450, 700…). Racha = días locales consecutivos con al menos un reto completado.

## Servidor (Supabase)

- **RLS**: catálogo de solo lectura para todos; cada tabla de usuario solo es legible por su dueño. Intentos, ledger, logros y descubrimientos **no** admiten escrituras directas: solo vía funciones `SECURITY DEFINER`.
- **`sync_progress(p_attempts, p_discoveries)`**: una única transacción que sirve tanto para migrar el progreso de invitado como para vaciar la cola offline. Los intentos usan el UUID del cliente, así que reintentar no duplica nada. Solo permite `accepted → completed | abandoned`, ignora retos desconocidos, recorta fechas futuras, aplica un tope diario de completados, abona con `points` del catálogo y `on conflict do nothing`, y evalúa logros en el servidor. El cliente **nunca** envía importes.
- **Storage**: bucket privado `evidence`, 8 MB, solo JPEG/PNG/WebP, objetos bajo `<user_id>/…` accesibles solo por su dueño.
- Las rachas del servidor se calculan en días UTC; las locales, en la zona horaria del dispositivo. Para cuentas, el saldo del servidor es el autoritativo.

## Sincronización offline

Cada intento/descubrimiento modificado localmente queda marcado `dirty`. Con sesión iniciada, `useAccountSync` envía los registros sucios al iniciar sesión, al pulsar «Sincronizar ahora» y en el evento `online`. Tras una respuesta correcta solo se limpia `dirty` si el registro no cambió mientras tanto (se compara `updatedAt` / `lastSeenAt`).

## PWA y caché

`public/sw.js` (registrado solo en producción):
- Páginas del shell: precacheadas al instalar (junto con los chunks `/_next/static` que referencian); network-first con timeout de 3 s y fallback a caché y luego a `/offline`.
- `/_next/static/*`: cache-first (inmutables por hash).
- Íconos y manifest: stale-while-revalidate.
- **Nunca** se cachean: peticiones no GET, de otros orígenes (Supabase API y Storage), con `Authorization`, ni peticiones RSC. Las evidencias viven en IndexedDB y no pasan por la red ni por Cache Storage.
- `npm run build` sella el SW con el build id, así cada despliegue invalida las cachés anteriores.

## Privacidad

- Las fotos se re-codifican en un canvas (máx. 1600 px, WebP): se eliminan metadatos EXIF como la ubicación GPS. Validación con Zod de tipo (JPG/PNG/WebP/HEIC) y tamaño (≤ 8 MB).
- Evidencias privadas por defecto (`visibility = 'private'` forzado por constraint), eliminables individualmente o junto con todos los datos.
- Exportación JSON de todos los datos (sin binarios de fotos).
- Sin funciones sociales ni publicación de evidencias.
- Los retos se redactaron evitando contenido íntimo, documentos, direcciones, datos de terceros o acciones peligrosas; varias instrucciones lo recuerdan explícitamente.

## Accesibilidad

Objetivo WCAG 2.2 AA: alternativas al swipe con botones y teclado, `aria-live` para anunciar cartas reveladas y decisiones, diálogos Radix con trampa y restauración de foco, pestañas WAI-ARIA, áreas táctiles de 44 px en los controles principales (≥ 24 px en el resto), foco visible, `prefers-reduced-motion` respetado (y sobrescribible en Configuración), skip link y etiquetas en todos los controles icónicos.

## Siguientes pasos sugeridos

- Probar `sync_progress` contra una instancia real y añadir tests SQL (pgTAP).
- Subida opcional de evidencias al bucket privado con URLs firmadas de corta duración.
- Tienda de recompensas que gaste saldo (entradas negativas en el ledger).
- Notificaciones push para rachas.
