ould not find a declaration file for module 'cookie'. 'c:/Users/Cicada38/Projects/modules/auth_module/package/node_modules/cookie/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/cookie` if it exists or add a new declaration (.d.ts) file containing `declare module 'cookie';`ts(7016)


  PS C:\Users\Cicada38\Projects\modules\auth_module\package> npm install  
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated npmlog@5.0.1: This package is no longer supported.        
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated are-we-there-yet@2.0.0: This package is no longer supported.
npm warn deprecated gauge@3.0.2: This package is no longer supported.

> @lean-kit/auth@0.1.0 prepare
> npm run build


> @lean-kit/auth@0.1.0 build
> tsc -p tsconfig.build.json

src/lib/audit/audit.service.ts:2:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request } from 'express';
                               ~~~~~~~~~

src/lib/auth/auth.controller.ts:2:40 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request, Response } from 'express';
                                         ~~~~~~~~~

src/lib/auth/auth.controller.ts:40:14 - error TS2339: Property 'body' does not exist on type '{ status: number; }'.

40     return r.body ?? {};
                ~~~~

src/lib/auth/auth.controller.ts:73:14 - error TS2339: Property 'body' does not exist on type '{ status: number; }'.

73     return r.body ?? {};
                ~~~~

src/lib/auth/auth.service.ts:2:40 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request, Response } from 'express';
                                         ~~~~~~~~~

src/lib/common/cookies.ts:1:27 - error TS7016: Could not find a declaration file for module 'cookie'. 'C:/Users/Cicada38/Projects/modules/auth_module/package/node_modules/cookie/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/cookie` if it exists or add a new declaration (.d.ts) file containing `declare module 'cookie';`

1 import { serialize } from 'cookie';
                            ~~~~~~~~

src/lib/common/http.ts:1:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

1 import type { Request } from 'express';
                               ~~~~~~~~~

src/lib/csrf/csrf.middleware.ts:2:54 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request, Response, NextFunction } from 'express';
                                                       ~~~~~~~~~

src/lib/csrf/csrf.middleware.ts:3:34 - error TS7016: Could not find a declaration file for module 'cookie'. 'C:/Users/Cicada38/Projects/modules/auth_module/package/node_modules/cookie/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/cookie` if it exists or add a new declaration (.d.ts) file containing `declare module 'cookie';`

3 import { parse, serialize } from 'cookie';
                                   ~~~~~~~~

src/lib/mailer/mailer.service.ts:2:24 - error TS7016: Could not find a declaration file for module 'nodemailer'. 'C:/Users/Cicada38/Projects/modules/auth_module/package/node_modules/nodemailer/lib/nodemailer.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/nodemailer` if it exists or add a new declaration (.d.ts) file containing `declare module 'nodemailer';`

2 import nodemailer from 'nodemailer';
                         ~~~~~~~~~~~~

src/lib/ratelimit/ratelimit.guard.ts:6:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

6 import type { Request } from 'express';
                               ~~~~~~~~~

src/lib/session/session.guard.ts:2:23 - error TS7016: Could not find a declaration file for module 'cookie'. 'C:/Users/Cicada38/Projects/modules/auth_module/package/node_modules/cookie/index.js' implicitly has an 'any' type.
  Try `npm i --save-dev @types/cookie` if it exists or add a new declaration (.d.ts) file containing `declare module 'cookie';`

2 import { parse } from 'cookie';
                        ~~~~~~~~

src/lib/session/session.guard.ts:3:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

3 import type { Request } from 'express';
                               ~~~~~~~~~

src/lib/session/session.service.ts:2:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request } from 'express';
                               ~~~~~~~~~

src/lib/session/sessions.controller.ts:2:30 - error TS2307: Cannot find module 'express' or its corresponding type declarations.

2 import type { Request } from 'express';
                               ~~~~~~~~~


Found 15 errors in 11 files.

Errors  Files
     1  src/lib/audit/audit.service.ts:2
     3  src/lib/auth/auth.controller.ts:2
     1  src/lib/auth/auth.service.ts:2
     1  src/lib/common/cookies.ts:1
     1  src/lib/common/http.ts:1
     2  src/lib/csrf/csrf.middleware.ts:2
     1  src/lib/mailer/mailer.service.ts:2
     1  src/lib/ratelimit/ratelimit.guard.ts:6
     2  src/lib/session/session.guard.ts:2
     1  src/lib/session/session.service.ts:2
     1  src/lib/session/sessions.controller.ts:2
npm error code 2
npm error path C:\Users\Cicada38\Projects\modules\auth_module\package
npm error command failed
npm error command C:\WINDOWS\system32\cmd.exe /d /s /c npm run build
npm error A complete log of this run can be found in: C:\Users\Cicada38\AppData\Local\npm-cache\_logs\2025-09-04T20_21_37_629Z-debug-0.log