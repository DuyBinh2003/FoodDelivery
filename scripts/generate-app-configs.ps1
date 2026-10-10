$apps = @("user-service", "restaurant-service", "order-service", "delivery-service", "admin-service", "search-service")
$cwd = "d:\code\FoodDelivery\backend"
Set-Location $cwd

$ports = @{
    "user-service" = 3001
    "restaurant-service" = 3002
    "order-service" = 3003
    "delivery-service" = 3004
    "admin-service" = 3005
    "search-service" = 3006
}

foreach ($app in $apps) {
    # Create tsconfig.app.json
    $tsconfig = @"
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/$app",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
"@
    Set-Content -Path "apps/$app/tsconfig.app.json" -Value $tsconfig

    # Generate basic main.ts for the app (temporary, will replace the monolithic one)
    $port = $ports[$app]
    $moduleName = $app.Replace("-service", "")
    # For user-service -> users, restaurant-service -> restaurants, etc.
    if ($moduleName -eq "user") { $moduleName = "users" }
    elseif ($moduleName -eq "restaurant") { $moduleName = "restaurants" }
    elseif ($moduleName -eq "order") { $moduleName = "orders" }
    elseif ($moduleName -eq "delivery") { $moduleName = "drivers" }
    
    # Uppercase first letter
    $moduleClass = (Get-Culture).TextInfo.ToTitleCase($moduleName) + "Module"
    
    $mainTs = @"
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { $moduleClass } from '@/modules/$moduleName/$($moduleName).module.js';
// TODO: Create a proper AppModule for this microservice

async function bootstrap() {
  const app = await NestFactory.create($moduleClass);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen($port);
  console.log(`$app is running on: http://localhost:$port`);
}
await bootstrap();
"@
    Set-Content -Path "apps/$app/src/main.ts" -Value $mainTs
}

Write-Host "Generated tsconfig.app.json and main.ts for all apps."
