Frontend: Next.js (Cookie Sessions)

Goals
- Use server-side cookie sessions; avoid storing secrets in the browser.

Recommendations
- Use fetch wrappers that include credentials (`credentials: 'include'`).
- On first GET, backend may set CSRF cookie; include `x-csrf-token` header on mutating requests.
- For SSR, read user via `/auth/me` on the server and pass to client via props or a session context.
- Handle 401s by redirecting to login; clear client-side cached user state.

Example fetch
```ts
await fetch('/auth/logout', { method: 'POST', headers: { 'x-csrf-token': getCsrf() }, credentials: 'include' });
```

