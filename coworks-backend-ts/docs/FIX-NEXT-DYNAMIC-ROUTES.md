# Fix for Next.js Dynamic Server Usage Error

This document explains the fix for the Next.js error:
`Dynamic server usage: Route [path] couldn't be rendered statically because it used request.url`

## Root Cause

In Next.js 14+, routes that use dynamic features like `request.url` need to be explicitly marked as dynamic. Otherwise, Next.js will try to render them statically at build time, causing errors when the route needs to access request-specific information like query parameters or headers.

## Implemented Fixes

We added the following configuration to all API routes that use `request.url`:

```typescript
export const dynamic = 'force-dynamic';
```

This explicitly tells Next.js that the route should be rendered dynamically at request time, not statically at build time.

The following files were updated:

1. `src/app/api/slots/branch-seating/route.ts`
2. `src/app/api/slots/categorized/route.ts`
3. `src/app/api/slots/route.ts`
4. `src/app/api/slots/seating-type/route.ts`
5. `src/app/api/seating-types/route.ts`
6. `src/app/api/seat/route.ts`
7. `src/app/api/payments/route.ts`
8. `src/app/api/branches/route.ts`

## Best Practices Going Forward

When creating new API routes:

1. If the route needs to access `request.url`, `request.headers`, or any other request-specific information, add the dynamic export:
   
   ```typescript
   export const dynamic = 'force-dynamic';
   ```

2. For routes that only use path parameters (accessible via the `params` object), and don't need query parameters or headers, this configuration is not necessary.

## Additional Information

For more details on route segment configuration in Next.js, see the official documentation at:
https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

For information on the specific error we encountered, see:
https://nextjs.org/docs/messages/dynamic-server-error 