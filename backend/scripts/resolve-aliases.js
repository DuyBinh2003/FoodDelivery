import { execSync } from 'child_process';

const services = [
  'user-service',
  'admin-service',
  'restaurant-service',
  'order-service',
  'delivery-service',
  'search-service',
  'payment-service',
];

for (const service of services) {
  console.log(`Resolving aliases for ${service}...`);
  execSync(
    `npx tsc-alias -p apps/${service}/tsconfig.json --dir dist/apps/${service}`,
    { stdio: 'inherit' }
  );
}

console.log('All aliases resolved successfully.');
