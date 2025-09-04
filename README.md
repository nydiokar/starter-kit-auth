Lean Auth Module

Purpose: A minimal, production-safe authentication and authorization baseline you can drop into a service. This folder holds the LLM-ready plan, supporting docs, and examples to guide fast implementation.

Contents
- docs/: Explanations, endpoints, security, testing, packaging
- config/.env.example: Environment variables you should define
- examples/: HTTP and curl samples for quick testing
- add_this.md: How to consume this as an npm dependency
- package/: Minimal npm package skeleton (build + publish)
- lean_auth_template_v_1_llm_ready.md: The master LLM-ready build plan

Quick Start
- Read docs/overview.md to understand the architecture and scope.
- Choose: integrate code directly or consume as a package.
  - Direct: follow docs/setup.md and docs/implementation_nest_prisma.md.
  - Package: read add_this.md and docs/packaging.md, then publish/use package/.
- Copy config/.env.example and fill values for your environment.
- Use examples/http/requests.http to verify endpoints as you build.

Status
- Template v1 with NestJS + Prisma references; implementation packaged under `package/`.
- Implemented: Session, Auth, CSRF, RateLimit, RBAC, Mailer, Audit (services, guards, controllers, DTOs).
- Pending: Demo mode guard rules, broader unit/e2e tests, typed Prisma interfaces, sample consumer app.

Run/Use Options
- Package: build and publish `auth_module/package/` (see docs/packaging.md), then integrate per add_this.md.
- Direct: copy `auth_module/package/src/lib` into your Nest app and wire tokens/env per docs.
