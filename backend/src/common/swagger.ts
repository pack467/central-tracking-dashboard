// Swagger UI (/docs) is on by default outside production; SWAGGER_ENABLED=true|false overrides.
export function isSwaggerEnabled(): boolean {
  return process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';
}
