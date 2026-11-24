# Portfolio frontend

Next.js App Router frontend for the public portfolio and protected
admin/editor workspace.

The companion FastAPI backend is maintained in the
[portfolio-backend repository](https://github.com/Slipinmaven/portfolio-backend).

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Tiptap
- Font Awesome free brand SVGs

## Public routes

| Route | Purpose |
| --- | --- |
| `/` | Portfolio home or published CMS Home page |
| `/projects` | Published project index |
| `/projects/{slug}` | Published project detail |
| `/articles` | Published articles |
| `/articles/{slug}` | Published article |
| `/notes` | Published notes |
| `/notes/{slug}` | Published note |
| `/resources` | Published resources |
| `/resources/{resourceId}` | Published resource detail |
| `/categories/{slug}` | Published category content |
| `/{slug}` | Published CMS page |
| `/contact` | Contact system page |

## Admin routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Sign-in |
| `/admin` | Workspace overview |
| `/admin/projects` | Project management |
| `/admin/posts` | Article and note management |
| `/admin/pages` | CMS page and revision management |
| `/admin/media` | Media library |
| `/admin/resources` | Resource management |
| `/admin/categories` | Category management |
| `/admin/tags` | Tag management |
| `/admin/navigation` | Header and footer navigation |
| `/admin/settings` | Profile and public contact settings |

## Setup

Start the API by following the setup instructions in the
[backend repository](https://github.com/Slipinmaven/portfolio-backend). It
should be reachable at `http://localhost:8001`, and its `CORS_ORIGINS` must
allow `http://localhost:3000`.

From the frontend repository root, install dependencies and start the app:

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. The API defaults to
`http://localhost:8001`.

Override the API origin when required:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

Add the exact frontend origin to backend `CORS_ORIGINS`.
Login, refresh, and logout use a same-origin Next.js rewrite to the backend so
the backend's HttpOnly refresh cookie remains first-party in the browser. The
rewrite target uses `NEXT_PUBLIC_API_BASE_URL` (or `http://localhost:8001` for
local development).

## Checks

```powershell
npm run lint
npm run build
npm run start
```

Vercel runs `scripts/wait-for-backend.mjs` before the production build. It polls
the public site-settings endpoint for up to three minutes so a sleeping backend
can wake before prerendering starts. Configure `NEXT_PUBLIC_API_BASE_URL` in
Vercel; the deployment fails with an explicit timeout if the API or database
does not become ready.

There is currently no frontend test script in `package.json`. UI changes should
be validated in mobile and desktop browser viewports until automated browser
tests are added.

## Structure

```text
src/
├── app/
│   ├── (portfolio)/       Public routes
│   ├── (dashboard)/       Protected admin and editor routes
│   └── (auth)/            Login routes
├── features/
│   ├── auth/
│   ├── admin/
│   ├── portfolio/
│   ├── projects/
│   ├── posts/
│   ├── pages/
│   ├── media/
│   ├── resources/
│   ├── navigation/
│   ├── taxonomy/
│   └── site-settings/
└── lib/
```

Route files should remain thin. Feature components, browser state, API
integration, types, and domain behavior belong in `src/features/<feature>/`.

## Authentication

Access JWTs are kept in memory. Refresh credentials use backend HttpOnly
cookies. Protected API calls use the shared authenticated request helper and
the admin session guard.

Frontend checks improve navigation and user experience but do not grant API
access. Backend authorization remains mandatory.

## Responsive conventions

- Mobile uses a fixed bottom navigation bar and "More" panel.
- Desktop uses the sidebar and workspace header.
- Mobile content uses one-column layouts.
- Desktop management lists use tables where appropriate.
- Mobile lists use cards or compact stacked rows.
- Controls provide visible focus and touch-sized targets.
- Motion respects `prefers-reduced-motion`.

## Rich text

The post and page editors use Tiptap and store Markdown. Supported operations
include headings, emphasis, alignment, lists, quotes, code blocks, dividers,
links, inline media, and downloadable document links.

## Production

```powershell
npm run build
npm run start
```

Configure `NEXT_PUBLIC_API_BASE_URL` for the deployment environment and ensure
the API origin is reachable from the selected frontend deployment topology.
