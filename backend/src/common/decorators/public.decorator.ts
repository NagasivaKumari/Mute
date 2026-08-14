import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const API_KEY_AUTH = 'apiKeyAuth';
export const ApiKeyOnly = () => SetMetadata(API_KEY_AUTH, true);
