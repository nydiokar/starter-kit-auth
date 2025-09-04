Packaging (npm)

Structure
- package/: Source for the npm module
- package/src/: Exported Nest modules, DTOs, guards, tokens
- package/dist/: Compiled output (built by tsc or tsup)

package.json (template)
```
{
  "name": "@lean-kit/auth",
  "version": "0.1.0",
  "description": "Lean Auth for NestJS (opaque sessions, RBAC, CSRF)",
  "keywords": ["auth", "nestjs", "prisma", "redis", "csrf", "rbac"],
  "license": "MIT",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "clean": "rimraf dist",
    "prepare": "npm run build",
    "pub": "npm publish --access public"
  },
  "peerDependencies": {
    "@nestjs/common": ">=9",
    "@nestjs/core": ">=9",
    "@prisma/client": ">=5",
    "ioredis": ">=5"
  },
  "dependencies": {
    "argon2": "^0.31.2",
    "cookie": "^0.6.0",
    "nodemailer": "^6.9.11"
  }
}
```

Build Config
- tsconfig.json: `"declaration": true`, `"outDir": "dist"`
- Optionally use `tsup` for CJS+ESM dual build

What Not To Ship
- Prisma migrations or schema files (document them instead)
- App-specific controllers beyond auth scope

Release Process
- Update changelog; bump semver
- `npm run clean && npm run build`
- `npm publish --access public` (or private scope)

Consumer Integration
- See `auth_module/add_this.md` for exact steps

