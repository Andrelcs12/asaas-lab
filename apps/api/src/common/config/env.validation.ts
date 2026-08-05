import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  development = 'development',
  production = 'production',
  test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  API_PORT?: string;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  API_URL?: string;

  @IsOptional()
  @IsString()
  WEB_URL?: string;

  @IsOptional()
  @IsString()
  PAYMENT_PROVIDER?: string;

  /** @deprecated use ASAAS_ENV */
  @IsOptional()
  @IsString()
  ASAAS_ENVIRONMENT?: string;

  @IsOptional()
  @IsString()
  ASAAS_ENV?: string;

  /** @deprecated use ASAAS_API_URL */
  @IsOptional()
  @IsString()
  ASAAS_BASE_URL?: string;

  @IsOptional()
  @IsString()
  ASAAS_API_URL?: string;

  @IsOptional()
  @IsString()
  ASAAS_API_KEY?: string;

  @IsOptional()
  @IsString()
  ASAAS_WEBHOOK_AUTH_TOKEN?: string;

  @IsOptional()
  @IsString()
  ASAAS_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`,
    );
  }
  return validated;
}
