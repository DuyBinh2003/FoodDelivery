$ErrorActionPreference = "Stop"
$cwd = "d:\code\FoodDelivery\backend"
Set-Location $cwd

Write-Host "1. Creating monorepo folders..."
New-Item -ItemType Directory -Force -Path "apps/user-service/src"
New-Item -ItemType Directory -Force -Path "apps/restaurant-service/src"
New-Item -ItemType Directory -Force -Path "apps/order-service/src"
New-Item -ItemType Directory -Force -Path "apps/delivery-service/src"
New-Item -ItemType Directory -Force -Path "apps/admin-service/src"
New-Item -ItemType Directory -Force -Path "apps/search-service/src"
New-Item -ItemType Directory -Force -Path "libs/common/src"
New-Item -ItemType Directory -Force -Path "libs/config/src"

Write-Host "2. Moving modules to apps..."
Move-Item -Path "src/modules/users" -Destination "apps/user-service/src/" -Force
Move-Item -Path "src/modules/auth" -Destination "apps/user-service/src/" -Force
Move-Item -Path "src/modules/restaurants" -Destination "apps/restaurant-service/src/" -Force
Move-Item -Path "src/modules/orders" -Destination "apps/order-service/src/" -Force
Move-Item -Path "src/modules/drivers" -Destination "apps/delivery-service/src/" -Force
Move-Item -Path "src/modules/admin" -Destination "apps/admin-service/src/" -Force
Move-Item -Path "src/modules/search" -Destination "apps/search-service/src/" -Force

Write-Host "3. Moving common and config to libs..."
# Copy contents inside src/common/ to libs/common/src/
Get-ChildItem -Path "src/common" | Move-Item -Destination "libs/common/src/" -Force
Get-ChildItem -Path "src/config" | Move-Item -Destination "libs/config/src/" -Force

Write-Host "4. Cleaning up old src directory..."
Remove-Item -Path "src/common" -Recurse -Force
Remove-Item -Path "src/config" -Recurse -Force
Remove-Item -Path "src/modules" -Recurse -Force

Write-Host "Monorepo migration step 1 completed successfully!"
