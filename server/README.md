# TourGuideAI API Server

This is the backend API server for the TourGuideAI application, which provides secure access to the OpenAI and Google Maps APIs. It includes caching, rate limiting, and error handling for optimal performance and reliability.

## Features

- Secure API proxy for OpenAI and Google Maps
- Environment-based configuration
- Request caching to reduce API costs
- Rate limiting to prevent abuse
- Comprehensive error handling
- Logging for monitoring and debugging
- Production-ready setup

## Requirements

- Node.js 18.x or higher
- NPM or Yarn package manager
- OpenAI API key
- Google Maps API key

## Installation

1. Clone the repository and navigate to the server directory:

```bash
git clone <repository-url>
cd TourGuideAI/server
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env` file in the server directory based on the provided `.env.example` file:

```bash
cp .env.example .env
```

Edit the `.env` file and add your API keys and other configuration:

```
# Server configuration
PORT=3000
NODE_ENV=development

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# OpenAI configuration
OPENAI_MODEL=gpt-4o

# Cache configuration (in milliseconds)
CACHE_DURATION=3600000  # 1 hour

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # 100 requests per window

# Security
ALLOWED_ORIGIN=http://localhost:8000  # Frontend origin
```

## Usage

### Development Mode

To run the server in development mode with hot reloading:

```bash
npm run dev
# or
yarn dev
```

### Production Mode

To run the server in production mode:

```bash
npm start
# or
yarn start
```

### Testing the Server

To verify the server is working correctly:

```bash
node test-server.js
```

## API Endpoints

### Health Check

- `GET /health` - Check if the server is running

### OpenAI API

- `POST /api/openai/recognize-intent` - Extract travel intent from text
- `POST /api/openai/generate-route` - Generate a travel itinerary
- `POST /api/openai/generate-random-route` - Generate a random travel itinerary
- `POST /api/openai/split-route-by-day` - Split a route into daily itineraries

### Google Maps API

- `GET /api/maps/geocode` - Convert address to coordinates
- `GET /api/maps/nearby` - Find nearby places
- `GET /api/maps/directions` - Get directions between points
- `GET /api/maps/place` - Get details about a place
- `GET /api/maps/photo` - Get place photos
- `GET /api/maps/autocomplete` - Get place autocomplete suggestions

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