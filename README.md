# Challenge Cards

PWA mobile-first de cartas coleccionables con desafíos personales. Descubre una carta, revélala, deslízala para aceptarla o rechazarla, completa el reto y gana puntos, niveles y logros. Funciona como invitado, sin registro y sin conexión.

## Requisitos

- Node.js ≥ 20.9 (probado con Node 24)
- npm

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:3000 (sin service worker)
```

Para probar la PWA completa (service worker, instalación, modo offline) usa la build de producción:

```bash
npm run build && npm start   # http://localhost:3000
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Turbopack). |
| `npm run build` | Build de producción + sella `public/sw.js` con el build id (`postbuild`). |
| `npm start` | Sirve la build de producción. |
| `npm run typecheck` | TypeScript estricto sin emitir. |
| `npm test` | Tests del motor de juego (node:test + fake-indexeddb). |
| `npm run icons` | Regenera los íconos PWA desde SVG. |
| `npm run db:seed` | Regenera `supabase/seed.sql` desde el catálogo TypeScript. |

## Qué incluye el MVP

- **Onboarding** de 3 pasos, sin registro.
- **Mazo** con 3 cartas apiladas, volteo 3D, swipe con física spring, sellos de feedback, botones alternativos y teclado (Enter/Espacio revela, ← rechaza, → acepta).
- **4 rarezas** (Común 55 %, Curiosa 25 %, Desafío 15 %, Legendaria 5 %) con efectos propios: brillo, chispas, borde aurora y destello especial al revelar una legendaria.
- **60 retos originales** en español (30/15/10/5) en `src/data/challenges.ts`.
- **Detalle del reto**: instrucciones, recompensa, tiempo, dificultad, evidencia opcional (foto o video desde la cámara o la galería, o nota), completar con confirmación explícita o abandonar.
- **Recompensa animada**, subida de nivel y logros desbloqueados.
- **Mis retos** (pendientes / completados / abandonados), **Colección** (60 huecos, filtros por rareza, estado y categoría, sin revelar contenido no descubierto), **Perfil** (nivel, XP, saldo, estadísticas, racha, logros, historial de puntos) y **Configuración** (sonido, vibración, animaciones reducidas, instalación, privacidad, exportar y borrar datos, cuenta opcional).
- **PWA**: manifest, íconos 192/512 + maskable, service worker con página offline e instrucciones de instalación para iOS, Android y escritorio.

## Catálogo de retos

Con Supabase configurado, los retos se leen de la tabla `challenges`: al editar una fila, la app la recibe la próxima vez que se abra con conexión. La última copia se guarda en IndexedDB para jugar sin conexión, y `src/data/challenges.ts` sirve de catálogo inicial y de respaldo. Las rarezas, categorías y dificultades siguen definidas en `src/lib/game/config.ts`: una fila con un valor desconocido se ignora. Para retirar un reto usa `available = false` en lugar de borrarlo, porque otras tablas lo referencian.

## Panel de administración

`/admin` tiene dos pestañas. **Versión** permite crear versiones y elegir la activa, que se muestra en Configuración. **Retos** permite editar, crear y retirar retos. No aparece en la navegación. El acceso real lo imponen las políticas RLS de Supabase: solo las cuentas en `admin_users` pueden escribir en `challenges`. Para añadir una, crea el usuario en Supabase → Authentication y ejecuta en el SQL Editor:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'correo@ejemplo.com';
```

## Persistencia y cuenta

Por defecto todo se guarda en **IndexedDB** en el dispositivo (modo invitado). No hay sincronización remota mientras Supabase no esté configurado; la app lo indica claramente en Configuración.

### Conectar Supabase (opcional)

1. Crea un proyecto en Supabase.
2. Aplica las migraciones y el seed:
   ```bash
   supabase link --project-ref <ref>
   supabase db push --include-seed
   ```
3. Copia `.env.example` a `.env.local` y rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. En Supabase → Authentication → URL Configuration añade `http://localhost:3000/ajustes` (y tu dominio) como redirect URL del enlace mágico.
5. Reinicia la app. En **Configuración → Cuenta** aparece el acceso por correo. Al entrar, el progreso local se migra con la RPC `sync_progress` y se vuelve a sincronizar automáticamente al recuperar la conexión.

> La integración remota está escrita contra las migraciones de este repo pero **no se ha probado contra una instancia real de Supabase**. Las evidencias (fotos y notas) se quedan en el dispositivo en esta versión; el bucket privado `evidence` y sus políticas ya están creados para cuando se active su subida.

Más detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
