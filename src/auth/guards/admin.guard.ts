import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user; // This comes from JwtAuthGuard
    
    if (!userPayload || !userPayload.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch fresh user data to check admin status
    const user = await this.userService.viewUser(userPayload.sub);
    
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}