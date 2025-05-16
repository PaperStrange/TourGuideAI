# CDN Implementation Refactoring Plan

## Summary
This document outlines a comprehensive refactoring plan for the TourGuideAI CDN implementation. The refactoring aims to improve code organization, enhance performance, strengthen security, and integrate seamlessly with our CI/CD pipeline.

## 1. Code Structure Refactors

### 1.1 Create a dedicated CDN service module

**Current Issues:**
- CDN functionality is spread across multiple files without clear boundaries
- Responsibilities overlap between config, middleware, and utility functions
- No clear service abstraction for CDN operations

**Proposed Changes:**
- Create a structured CDN service with clear API
- Move implementation details into the service
- Establish clear separation of concerns

```javascript
// Proposed service structure in server/services/cdnService.js
const { S3Client, CloudFrontClient } = require('@aws-sdk/client-s3');
const cdnConfig = require('../config/cdn');
const logger = require('../utils/logger');

class CdnService {
  constructor(config = cdnConfig.getCdnConfig()) {
    this.config = config;
    this.initialized = false;
    this.s3Client = null;
    this.cloudFrontClient = null;
  }
  
  initialize() {
    // Initialize clients only when needed
    if (!this.config.enabled) return false;
    // Initialize clients with AWS SDK v3
    // ...
  }
  
  // Rest of methods here...
}

module.exports = new CdnService();
```

### 1.2 Refactor file structure for better organization

**Current Structure:**
```
server/
  ├── config/
  │   └── cdn.js
  ├── middleware/
  │   └── cdnMiddleware.js
  ├── utils/
  │   └── cdnManager.js
  └── server.js
```

**Proposed Structure:**
```
server/
  ├── config/
  │   └── cdn.js                 // Only configuration, no implementation
  ├── services/
  │   └── cdnService/
  │       ├── index.js           // Main service export
  │       ├── assetProcessor.js  // Asset processing functions
  │       ├── cacheManager.js    // Cache management functions
  │       └── storageClient.js   // S3/CloudFront interactions
  ├── middleware/
  │   └── cdnMiddleware.js       // Only Express middleware using service
  └── server.js
```

## 2. Performance Improvement Refactors

### 2.1 Upgrade to AWS SDK v3

**Current Issues:**
- Using AWS SDK v2 which is legacy
- Monolithic SDK increases bundle size
- Less efficient API calls

**Proposed Changes:**
- Replace `aws-sdk` with modular v3 packages:
  - `@aws-sdk/client-s3`
  - `@aws-sdk/client-cloudfront`
  - `@aws-sdk/s3-request-presigner`
- Benefit from improved performance and smaller bundle size
- Implement proper client caching and reuse

### 2.2 Optimize asset delivery

**Current Issues:**
- No content type auto-detection
- No image optimization or compression pipeline
- Limited cache control strategies

**Proposed Changes:**
- Implement content type auto-detection
- Add image optimization pipeline for uploads
- Use service worker for improved caching
- Implement staggered cache invalidation strategies
- Implement WebP conversion for images

### 2.3 Implement proper asset bundling

**Current Issues:**
- Static assets not properly organized for CDN
- No versioning strategy for cache busting

**Proposed Changes:**
- Use hashed filenames for all assets
- Implement chunking strategy based on asset types
- Set up proper long-term caching with immutable assets
- Configure compression for assets (Brotli/Gzip)

## 3. Security Vulnerability Refactors

### 3.1 Improve credential handling

**Current Issues:**
- Credentials directly used in code
- No rotation mechanism
- No secure credential storage in CI/CD

**Proposed Changes:**
- Use IAM roles for EC2/Lambda instead of hard-coded credentials
- Implement AWS credential provider chain
- Use AWS Secrets Manager for sensitive data

### 3.2 Enhance CDN security

**Current Issues:**
- Basic CORS configuration
- No Content Security Policy implementation
- ACL set to public-read for all assets

**Proposed Changes:**
- Implement Origin Access Identity (OAI) for S3 buckets
- Add proper CORS configuration for different asset types
- Configure security headers in CloudFront (Content-Security-Policy, etc.)
- Implement proper access controls with signed URLs for sensitive assets

## 4. CI/CD and Infrastructure Refactors

### 4.1 Integrate CDN deployment into CI/CD pipeline

**Current Issues:**
- Separate deployment script not integrated with main pipeline
- No automated cache invalidation on deployment
- No staging/production separation

**Proposed Changes:**
- Integrate CDN deployment into GitHub Actions workflow
- Implement environment-specific deployment configurations
- Add automated cache invalidation based on changed files
- Implement smoke tests for CDN assets after deployment

### 4.2 Infrastructure as Code improvements

**Current Issues:**
- CDN configuration not managed as code
- Manual setup required for new environments

**Proposed Changes:**
- Create CloudFormation/Terraform templates for CDN infrastructure
- Automate distribution creation and configuration
- Implement monitoring and alerting for CDN metrics
- Set up proper logging for CDN access

## 5. Testing Improvements

### 5.1 Enhance CDN service testability

**Current Issues:**
- Limited unit tests for CDN functionality
- No mocking strategy for AWS services
- Integration tests coupled to real AWS services

**Proposed Changes:**
- Create comprehensive unit tests with proper mocking
- Implement integration tests with local mock S3
- Add performance tests for asset delivery

```javascript
// Example test approach
describe('CDN Service', () => {
  let cdnService;
  let mockS3Client;
  let mockCloudFrontClient;
  
  beforeEach(() => {
    mockS3Client = {
      send: jest.fn().mockResolvedValue({...})
    };
    mockCloudFrontClient = {
      send: jest.fn().mockResolvedValue({...})
    };
    
    cdnService = new CdnService();
    cdnService.s3Client = mockS3Client;
    cdnService.cloudFrontClient = mockCloudFrontClient;
  });
  
  test('should upload file to S3', async () => {
    // Test implementation
  });
});
```

### 5.2 Implement comprehensive testing suite

**Current Issues:**
- No end-to-end tests for CDN functionality
- Missing validation for asset delivery and optimization
- No automated performance benchmarks

**Proposed Changes:**
- Create end-to-end tests using localstack for AWS services simulation
- Implement visual regression testing for image optimization
- Add automated performance benchmarks for asset loading
- Create testing fixtures for various asset types (images, JS, CSS, fonts)

### 5.3 Improve monitoring and observability

**Current Issues:**
- Limited visibility into CDN performance metrics
- No real-time alerts for CDN issues
- Manual troubleshooting process for content delivery problems

**Proposed Changes:**
- Implement CloudWatch dashboards for CDN metrics visualization
- Add custom logging for CDN operations with structured data
- Create real-time alerting for performance degradation
- Implement distributed tracing for request path through CDN
- Set up synthetic monitoring for critical assets

```javascript
// Example monitoring implementation
const monitorCdnRequest = async (assetPath, options = {}) => {
  const startTime = Date.now();
  try {
    const result = await fetch(cdnService.getAssetUrl(assetPath));
    const endTime = Date.now();
    
    // Record metrics
    const metrics = {
      assetPath,
      responseTime: endTime - startTime,
      status: result.status,
      contentType: result.headers.get('content-type'),
      contentLength: result.headers.get('content-length'),
      cacheHit: result.headers.get('x-cache') === 'Hit from cloudfront'
    };
    
    // Send to monitoring system
    await metrics.publish('CDN_ASSET_REQUEST', metrics);
    
    return result;
  } catch (error) {
    // Log and alert on errors
    logger.error('CDN asset request failed', { assetPath, error });
    await alerting.trigger('CDN_ASSET_FAILURE', { assetPath, error });
    throw error;
  }
};
```

## 6. Implementation Plan

| Phase | Task | Priority | Estimated Effort | Dependencies |
|-------|------|----------|------------------|--------------|
| 1 | Create CDN service structure | High | 2 days | None |
| 1 | Upgrade to AWS SDK v3 | High | 3 days | None |
| 1 | Implement basic unit tests | High | 2 days | CDN service |
| 2 | Enhance asset delivery optimization | Medium | 3 days | CDN service |
| 2 | Improve security features | High | 2 days | AWS SDK v3 |
| 3 | CI/CD integration | Medium | 2 days | All phase 1 tasks |
| 3 | Infrastructure as Code | Medium | 3 days | None |
| 4 | Add performance tests | Low | 2 days | CI/CD integration |
| 4 | Documentation updates | Medium | 1 day | All previous tasks |

## 7. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Breaking changes in AWS SDK v3 | High | Medium | Thorough testing, phased migration |
| Performance regression | Medium | Low | Implement performance tests, monitor metrics |
| Security vulnerabilities | High | Low | Security review, follow AWS best practices |
| CI/CD integration failures | Medium | Medium | Staged rollout, backup deployment option |

## 8. Success Criteria

The refactoring will be considered successful when:

1. All CDN functionality uses the new service structure
2. AWS SDK v3 is fully implemented
3. Unit test coverage for CDN code is > 80%
4. Asset delivery performance is improved by at least 20%
5. Security vulnerabilities are addressed
6. CI/CD pipeline successfully deploys to all environments
7. No regressions in existing functionality

## 9. References

- [AWS SDK v3 Migration Guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html)
- [TourGuideAI Deployment Pipeline](../../deployment/pipelines/project.deployment-pipeline.md)
- [TourGuideAI Refactoring Plan](../plans/project.refactors-plan.md)
- [Test-Driven Refactoring Plan](../plans/project.refactors.test-driven.md) 