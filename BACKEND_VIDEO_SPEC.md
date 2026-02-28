# Backend: Exercise video URLs and start times

The frontend expects `GET /levels` (and level payloads) to return each exercise with a `video` field: a full YouTube URL. Optional `t=` (e.g. `t=60s`, `t=1m40s`) is parsed by the frontend for embed start time.

Update all exercises so they use these videos and start times. Use the same video/start for any exercise that repeats (e.g. wrist drills in every level = same URL and start as Level 1).

## Canonical list

| Exercise / section | Video URL | Start time |
|--------------------|-----------|------------|
| **Body line drill** | https://www.youtube.com/watch?v=2GnjFzWCXRU | (from start) |
| **Protracted plank** | https://www.youtube.com/watch?v=SLSi5oou1ws | 0:05 (`t=5s`) |
| **Wrist drills** (wrist heel raises, fin push-ups, and any “same as Level 1” wrist work) | Use same video as Level 1 wrist | Same start as Level 1 (e.g. `t=14s` if that’s current) |
| **Chest-to-wall handstand** | Keep current demo video | 1:00 (`t=60s`) |
| **Hollow body hold** (main) | https://www.youtube.com/watch?v=q4Xj8Nj7RQY | (from start) |
| **Hollow body hold** (beginner variation) | https://www.youtube.com/watch?v=DhF2_tGgXJE | (from start) |
| **Heel pulls** | Keep current demo video | 1:40 (`t=100s`) |
| **Toe pulls** | Same as heel pulls or current demo | 1:40 (`t=100s`) |
| **Handstand conditioning** | https://www.youtube.com/watch?v=nFziwQ5ixx8 | (from start) |
| **Handstand shoulder taps** | https://www.youtube.com/watch?v=r8WwpGQlq7U | 0:10 (`t=10s`) |
| **Freestanding handstand** | https://www.youtube.com/watch?v=NSj-238hdbg | 1:20 (`t=80s`) |

## Level 4

Ensure **Level 4 has a video on every section** (mobility, balance, strength), same pattern as other levels — i.e. each exercise block that has a demo in other levels should have a `video` value in Level 4 too (wrist/fin, desk/hang if you expose it, chest-to-wall, kick-up, balance game, etc.).

## Format

- Store full URL including query, e.g. `https://www.youtube.com/watch?v=SLSi5oou1ws&t=5s`.
- Frontend uses `extractVideoId(url)` for the embed ID and `getVideoStartSeconds(url)` which parses `t=` in forms like `t=60s`, `t=2m25s`, `t=1h2m3s`.

## Ebook

The ebook (`assets/ebook.html`) has been updated to use the same URLs and start times so the in-app ebook reader and the web app stay in sync.
