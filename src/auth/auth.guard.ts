import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';


@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
    
}
