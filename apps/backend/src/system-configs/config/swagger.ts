import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '180workspace Platform API',
            version: '2.0.0',
            description: 'Interactive API documentation for the 180workspace Platform backend',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Paths to files containing OpenAPI definitions
    apis: ['./src/routes/*.ts', './src/api/**/*.ts'],
};

const specs = swaggerJsdoc(options);

export default specs;
