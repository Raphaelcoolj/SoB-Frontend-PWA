# SoB Frontend

Next.js frontend for Sphere of Belief (SoB) — a content platform with personalized feeds, articles, and social features.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (auth store)
- **Data Fetching**: SWR + SWR Infinite
- **Real-time**: Socket.IO client
- **Icons**: Lucide React
- **UI Components**: Custom (Skeleton, etc.)

## Project Structure

```
src/
├── app/
│   ├── (main)/       # Authenticated pages
│   │   ├── home/           # For You / Following feed + Trending
│   │   ├── search/         # Search + Discover fields
│   │   ├── create/         # Create post/article
│   │   ├── post/[id]/      # Single post/article view
│   │   ├── post/[id]/edit/ # Edit post
│   │   ├── profile/[username]/ # User profile
│   │   ├── bookmarks/      # Saved posts
│   │   ├── notifications/  # Notifications
│   │   └── settings/       # Settings pages
│   ├── (auth)/       # Auth pages (login, register, etc.)
│   ├── (admin)/      # Admin panel
│   └── layout.tsx    # Root layout
├── components/
│   ├── post/         # PostCard, ArticleCard, PostFeed, VideoPlayer
│   ├── search/       # SearchResults, DiscoverFields
│   ├── trending/     # TrendingSection (horizontal scroll)
│   ├── user/         # UserAvatar
│   ├── shared/       # Logo, etc.
│   └── ui/           # Skeleton
├── hooks/            # useFeed, useFollowingFeed, useSearch, useDiscoverFeed, etc.
├── lib/              # api.ts (fetchWithAuth), utils.ts, socket.ts
├── store/            # Zustand stores (authStore)
└── types/            # TypeScript interfaces (post.ts, user.ts)
```

## Getting Started

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/home` | Main feed with Trending horizontal scroll, For You and Following tabs |
| `/search` | Unified search + field-based discovery |
| `/create` | Create posts and articles (with media upload) |
| `/post/[id]` | Full article/post view |
| `/profile/[username]` | User profile with their posts |
| `/bookmarks` | Bookmarked/saved posts |
| `/notifications` | Real-time notifications |
| `/settings/fields` | Configure priority fields for feed |

## Feeds

### For You Feed
Scored aggregation from `GET /api/feed/fyf`. Uses SWR Infinite for cursor-based pagination (20 per page). Supports content type filtering (`all`/`articles`/`posts`).

### Following Feed
Randomized posts from followed users via `GET /api/feed/following`.

### Trending Section
Appears on `/home` above the main feed. Horizontal scrollable cards showing this week's most-read articles from `GET /api/feed/trending`.

## Data Flow

1. `fetchWithAuth()` in `src/lib/api.ts` handles all API calls
2. Automatically attaches Bearer token from Zustand auth store
3. On 401, attempts token refresh; if refresh fails, redirects to `/login`
4. SWR handles caching, deduplication, and revalidation
5. Socket.IO provides real-time updates (new posts, comments)
