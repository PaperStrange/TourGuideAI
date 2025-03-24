# TourGuideAI Server

Backend server for the TourGuideAI application, handling secure token management, proxy services, and authentication.

## Structure

- **routes**: API endpoint route handlers
- **middleware**: Express middleware functions
- **utils**: Utility functions and helpers
- **logs**: Server log files
- **config**: Configuration files for different environments
- **vault**: Secure token storage directory (created at runtime)

## Features

- **Secure Token Management**: Centralized vault for all API keys, tokens, and secrets
- **Token Rotation**: Automatic tracking of token age and rotation requirements
- **Multiple Backend Support**: Local, AWS Secrets Manager, or HashiCorp Vault support
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

Edit the `.env` file with your vault configuration and API keys.

3. Start the development server:

```bash
npm run dev
```

## Token Vault System

TourGuideAI uses a secure token vault system to protect sensitive credentials:

- **Centralized Management**: All tokens, API keys, and secrets are managed in one place
- **Encryption**: AES-256-GCM encryption for all stored credentials
- **Rotation Policy**: Configurable rotation periods based on token type
- **Multiple Backends**: Support for local file-based vault, AWS Secrets Manager, or HashiCorp Vault
- **Seamless Integration**: Legacy environment variables still work during transition

### Vault Configuration

Configure the vault in your `.env` file:

```
# Token Vault Configuration
VAULT_BACKEND=local # Options: local, aws, hashicorp, in-memory
VAULT_ENCRYPTION_KEY=your_vault_encryption_key_here
VAULT_SALT=your_vault_salt_here
VAULT_PATH=./vault/vault.enc # For local backend
IMPORT_ENV_SECRETS=true # Import from environment variables on startup
```

### Token Types and Rotation Periods

The vault supports different token types with appropriate rotation periods:

| Token Type | Usage | Default Rotation Period |
|------------|-------|-------------------------|
| API Key | External service API keys | 90 days |
| JWT Secret | Authentication tokens | 180 days |
| Encryption Key | Data encryption | 365 days |
| OAuth Token | OAuth authentication | 30 days |
| Database | Database credentials | 180 days |

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
| `/api/admin/tokens/rotation` | GET | List tokens needing rotation (admin only) |

## Environment Configuration

The server uses the following environment variables:

- `NODE_ENV`: Application environment (development, production)
- `PORT`: Server port (default: 3001)
- `VAULT_BACKEND`: Token vault backend type (local, aws, hashicorp, in-memory)
- `VAULT_ENCRYPTION_KEY`: Encryption key for the vault
- `VAULT_SALT`: Salt for key derivation
- `JWT_EXPIRY`: JWT token expiry time
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

For backward compatibility, the following legacy variables are still supported:

- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_MAPS_API_KEY`: Google Maps API key
- `JWT_SECRET`: Secret for signing JWT tokens
- `ENCRYPTION_KEY`: Key for data encryption
- `SENDGRID_API_KEY`: SendGrid API key

## Folder Structure

```
server/
├── logs/              # Log files (created at runtime)
├── vault/             # Secure token storage (created at runtime)
├── middleware/        # Express middleware
│   ├── apiKeyValidation.js
│   ├── authMiddleware.js
│   ├── caching.js
│   └── rateLimit.js
├── routes/            # API route handlers
│   ├── googlemaps.js
│   ├── openai.js
│   └── auth.js
├── utils/             # Utility functions
│   ├── vaultService.js
│   ├── tokenProvider.js
│   ├── jwtAuth.js
│   └── logger.js
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Example environment file
├── package.json       # Project dependencies
├── server.js          # Main server file
└── test-server.js     # Test script
```

## Production Deployment

When deploying to production, ensure:

1. Set `NODE_ENV=production` in your environment
2. Use a secure backend for the token vault (aws or hashicorp recommended)
3. Configure proper `ALLOWED_ORIGIN` for CORS
4. Set up a process manager like PM2 or run in Docker
5. Use HTTPS with valid SSL certificates
6. Set up proper monitoring and logging

## Security Considerations

- The vault encryption key and salt should be stored securely outside version control
- In production, consider using a KMS (Key Management Service) for the vault encryption key
- For highly secure environments, use a dedicated secrets manager like HashiCorp Vault
- Enable automatic token rotation monitoring and notifications
- Use environment-specific secrets with different rotation schedules
- Implement the principle of least privilege for all service accounts
- Never expose token rotation APIs to public networks

## License

MIT 