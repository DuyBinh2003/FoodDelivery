export const getDatabaseConfig = (configService) => ({
    type: 'postgres',
    url: configService.get('database.url'),
    synchronize: false,
    autoLoadEntities: true,
    logging: configService.get('nodeEnv') === 'development',
});
//# sourceMappingURL=database.config.js.map