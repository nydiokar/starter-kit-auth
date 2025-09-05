import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { CsrfMiddleware } from './csrf/csrf.middleware.js';

@Module({})
export class CsrfModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
