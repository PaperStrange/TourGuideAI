# TourGuideAI Server

Backend server for the TourGuideAI application, handling API key management, proxy services, and authentication.

## Structure

- **routes**: API endpoint route handlers
- **middleware**: Express middleware functions
- **utils**: Utility functions and helpers
- **logs**: Server log files
- **config**: Configuration files for different environments

## Features

- **API Key Management**: Secure storage and rotation of API keys
- **Proxy Services**: Route client requests to external APIs (OpenAI, Google Maps)
- **Rate Limiting**: Prevent API abuse and manage quotas
- **Caching**: Reduce duplicate API calls and improve performance
- **Authentication**: User authorization and access control
- **Logging**: Comprehensive logging for debugging and monitoring

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your API keys and configuration settings.

3. Start the development server:

```bash
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/openai/chat` | POST | Proxy to OpenAI Chat API |
| `/api/maps/geocode` | GET | Proxy to Google Maps Geocoding API |
| `/api/maps/directions` | GET | Proxy to Google Maps Directions API |
| `/api/maps/places` | GET | Proxy to Google Maps Places API |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | User logout |
| `/api/health` | GET | Server health check |

## Environment Configuration

The server uses the following environment variables:

- `NODE_ENV`: Application environment (development, production)
- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_MAPS_API_KEY`: Google Maps API key
- `JWT_SECRET`: Secret for signing JWT tokens
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## Folder Structure

```
server/
├── middleware/        # Express middleware
│   ├── apiKeyValidation.js
│   ├── caching.js
│   └── rateLimit.js
├── routes/            # API route handlers
│   ├── openai.js
│   └── googlemaps.js
├── utils/             # Utility functions
│   ├── apiHelpers.js
│   └── logger.js
├── logs/              # Log files (created at runtime)
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Example environment file
├── package.json       # Project dependencies
├── server.js          # Main server file
└── test-server.js     # Test script
```

## Production Deployment

When deploying to production, ensure:

1. Set `NODE_ENV=production` in your environment
2. Configure proper `ALLOWED_ORIGIN` for CORS
3. Set up a process manager like PM2 or run in Docker
4. Use HTTPS with valid SSL certificates
5. Set up proper monitoring and logging

## Security Considerations

- Keep your API keys secure and never commit them to version control
- Use environment variables for sensitive information
- Set proper CORS restrictions to prevent unauthorized access
- Consider using an API gateway or firewall for additional protection

## License

MIT 