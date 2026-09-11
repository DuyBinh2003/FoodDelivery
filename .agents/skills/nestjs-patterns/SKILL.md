---
name: nestjs-patterns
description: NestJS architecture patterns for modules, controllers, providers, DTO validation, guards, interceptors, config, TypeORM, and production-grade TypeScript backends. Use when building or reviewing a NestJS backend — modules, providers, DTO validation, guards, or interceptors.
metadata:
  origin: ECC
---

# NestJS Development Patterns

Production-grade NestJS patterns for modular TypeScript backends, adapted for the Food Delivery project's specific folder structure, conventions, and tech stack.

## When to Activate

- Building NestJS APIs or services
- Structuring modules, controllers, and providers
- Adding DTO validation, guards, interceptors, or exception filters
- Configuring environment-aware settings and database integrations (TypeORM)
- Testing NestJS units or HTTP endpoints (using Vitest)

## Project Structure

```text
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── configuration.ts
│   └── validation.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   └── users/
│       ├── dto/
│       ├── entities/
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
migrations/
```

- Keep domain code inside feature modules (`src/modules/*`).
- Put cross-cutting filters, decorators, guards, and interceptors in `src/common/`.
- Keep DTOs and TypeORM Entities close to the module that owns them.
- Migrations are managed via `node-pg-migrate` in the root `migrations/` folder of the backend.

## Bootstrap and Global Validation

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- Always enable `whitelist` and `forbidNonWhitelisted` on public APIs.
- Prefer one global validation pipe instead of repeating validation config per route.

## Modules, Controllers, and Providers

```ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto) {
    const user = this.usersRepo.create(dto);
    return this.usersRepo.save(user);
  }
}
```

- **Controllers should stay thin**: parse HTTP input, call a provider, return response DTOs.
- **Put business logic in injectable services**, not controllers.
- Export only the providers other modules genuinely need.

## DTOs and Validation

```ts
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

- Validate every request DTO with `class-validator`.
- Use dedicated response DTOs or serializers instead of returning ORM entities directly.
- Avoid leaking internal fields such as password hashes, tokens, or audit columns.

## Database Entities (TypeORM)

According to the project's **Database Schema Policy**:
- Tables MUST follow Microservices standard and use Master (`m_`) or Transaction (`t_`) prefixes.
- Primary Keys MUST always use `UUID`.

```ts
@Entity('m_users') // or 't_orders' depending on data type
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  name: string;
}
```

- Always define TypeORM entities according to these naming conventions.
- Keep entity classes in `entities/` inside their respective module.

## Auth, Guards, and Request Context

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/report')
getAdminReport(@Req() req: AuthenticatedRequest) {
  return this.reportService.getForUser(req.user.id);
}
```

- Keep auth strategies and guards module-local unless they are truly shared.
- Encode coarse access rules in guards, then do resource-specific authorization in services.
- Prefer explicit request types for authenticated request objects.

## Exception Filters and Error Shape

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json({
        path: request.url,
        error: exception.getResponse(),
      });
    }

    return response.status(500).json({
      path: request.url,
      error: 'Internal server error',
    });
  }
}
```

- Keep one consistent error envelope across the API.
- Throw framework exceptions for expected client errors; log and wrap unexpected failures centrally.

## Config and Environment Validation

```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
  validate: validateEnv,
});
```

- Validate env at boot, not lazily at first request.
- Keep config access behind typed helpers or config services.
- Split dev/staging/prod concerns in config factories instead of branching throughout feature code.

## Persistence and Transactions

- Keep repository / ORM code behind providers that speak domain language.
- Isolate TypeORM transactional workflows in services that own the unit of work.
- Do not let controllers coordinate multi-step writes directly.

## Testing (Vitest)

The project relies on **Vitest** rather than Jest. Ensure testing syntax and imports conform to Vitest.

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, beforeAll, it, expect } from 'vitest';

describe('UsersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  
  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
```

- Unit test providers in isolation with mocked dependencies.
- Add request-level tests for guards, validation pipes, and exception filters.
- Reuse the same global pipes/filters in tests that you use in production.

## Production Defaults

- Enable structured logging and request correlation ids.
- Terminate on invalid env/config instead of booting partially.
- Prefer async provider initialization for DB/cache clients with explicit health checks.
- Keep background jobs and event consumers in their own modules, not inside HTTP controllers.
- Make rate limiting, auth, and audit logging explicit for public endpoints.
