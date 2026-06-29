---
activation: model_decision
description: Role-Based Access Control (RBAC) and Auth Guards for Admin Dashboard
globs: ["**/app/**/*.tsx", "**/components/**/*.tsx", "**/middleware.ts"]
---
<rbac-auth-guard>

<rules>
- Always verify user session and roles before rendering any admin pages or data.
- Use Next.js Middleware to protect routes at the edge before rendering.
- Create higher-order components (HOC) or layout wrappers to check for specific roles and permissions.
- Redirect unauthenticated or unauthorized users to the login/403 page gracefully.
- Do not expose sensitive API endpoints to the client side without verifying the JWT token.
</rules>

</rbac-auth-guard>
