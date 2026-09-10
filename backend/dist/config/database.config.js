export const getDatabaseConfig = (configService) => ({
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    synchronize: false,
    autoLoadEntities: true,
    logging: configService.get('NODE_ENV') === 'development',
});
//# sourceMappingURL=database.config.js.map