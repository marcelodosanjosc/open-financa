import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayloadDto } from '@repo/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayloadDto | undefined, ctx: ExecutionContext): UserPayloadDto | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayloadDto;

    return data && user ? user[data] : user;
  },
);
