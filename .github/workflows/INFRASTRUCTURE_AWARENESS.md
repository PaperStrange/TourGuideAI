# Infrastructure-Aware CI/CD Pipeline

## Overview

The TourGuideAI CI/CD pipeline is designed to handle the reality that infrastructure (AWS, domains, CDN) may not be ready during early development phases. This document explains how the pipeline adapts to infrastructure availability.

## Current Infrastructure Status

### ❌ Not Ready for Deployment

The following infrastructure components are **not yet configured**:

- 🌐 **Domain Configuration**: `staging.tourguideai.com` and `app.tourguideai.com`
- ☁️ **AWS Infrastructure**: S3 buckets, CloudFront distributions, IAM roles
- 🔒 **SSL Certificates**: Domain validation and certificate installation
- 🔑 **GitHub Secrets**: AWS credentials and CloudFront distribution IDs

## Pipeline Behavior

### Infrastructure Check

Every CI/CD run begins with an infrastructure readiness check:

```yaml
infrastructure-check:
  runs-on: ubuntu-latest
  outputs:
    infrastructure-ready: ${{ steps.check.outputs.ready }}
    missing-requirements: ${{ steps.check.outputs.missing }}
```

**Current Result**: `infrastructure-ready: false`

### Conditional Deployment

Deployments are **automatically skipped** when infrastructure is not ready:

```yaml
deploy-staging:
  if: |
    (needs.infrastructure-check.outputs.infrastructure-ready == 'true')
```

**Current Result**: Staging and production deployments are skipped

### Mock Testing

When infrastructure isn't available, the pipeline runs **mock tests** instead of real environment tests:

- 🎭 **Mock Connectivity Tests**: Simulate network requests
- 🎭 **Mock Performance Tests**: Generate realistic response times
- 🧪 **Local Component Tests**: Test components that don't require infrastructure

## Working Without Infrastructure

### 1. Development and Testing

You can still:
- ✅ Run all local tests (unit, component, integration)
- ✅ Build the application successfully
- ✅ Validate code quality and security
- ✅ Test individual components and services
- ✅ Run mock deployment scenarios

### 2. Manual Deployment Override

For testing deployment scripts without infrastructure:

1. Go to **Actions** → **TourGuideAI CI/CD Pipeline**
2. Click **"Run workflow"**
3. Check **"Force deployment even without infrastructure"**
4. Select target environment

**Warning**: This will attempt actual deployment and likely fail, but useful for testing deployment scripts.

### 3. Local Development Server

Continue development using local servers:

```bash
# Frontend (http://localhost:3000)
npm start

# Backend (http://localhost:5000)
cd server && npm start
```

## Infrastructure Preparation

### Phase 1: Documentation ✅

- [x] Deployment preparation checklist created
- [x] Infrastructure requirements documented
- [x] CI/CD pipeline configured for infrastructure awareness

### Phase 2: Infrastructure Setup (Not Started)

1. **AWS Account Setup**
   - [ ] Create AWS production account
   - [ ] Set up IAM roles and policies
   - [ ] Configure billing alerts

2. **Domain and SSL**
   - [ ] Register `tourguideai.com` domain
   - [ ] Set up DNS configuration
   - [ ] Generate SSL certificates

3. **Storage and CDN**
   - [ ] Create S3 buckets for hosting
   - [ ] Configure CloudFront distributions
   - [ ] Set up backup strategies

4. **GitHub Integration**
   - [ ] Add AWS credentials as GitHub Secrets
   - [ ] Configure deployment keys
   - [ ] Test deployment workflows

### Phase 3: Deployment Enablement

Once infrastructure is ready:

1. Update infrastructure check logic
2. Test deployment with `force_deploy` option
3. Enable automatic deployments
4. Monitor deployment health

## Monitoring Infrastructure Readiness

### GitHub Actions Summary

Every CI/CD run provides clear infrastructure status:

```
## 🏗️ Infrastructure Status
Status: Not Ready for Deployment

Missing Components: aws-infrastructure,domain-configuration,cdn-setup

To Enable Deployments:
1. Review the Deployment Preparation Checklist
2. Set up AWS infrastructure (S3, CloudFront, IAM roles)
3. Configure domain and SSL certificates
4. Add required GitHub Secrets for deployment
5. Use 'force_deploy' option for testing without infrastructure
```

### Infrastructure Check Outputs

- `infrastructure-ready`: `true`/`false`
- `missing-requirements`: Comma-separated list of missing components

## Testing Strategies

### Current (No Infrastructure)

```yaml
# Mock tests run instead of real environment tests
- name: Run Mock Smoke Tests
  run: |
    echo "🎭 Running mock smoke tests (infrastructure not available)"
    npm test -- --testPathPattern="components|utils|services"
```

### Future (With Infrastructure)

```yaml
# Real environment tests run against deployed applications
- name: Run Environment Smoke Tests
  run: |
    echo "🧪 Running comprehensive smoke tests"
    curl -f "$BASE_URL/health"
    npm test -- --testPathPattern="smoke|integration"
```

## Benefits of This Approach

1. **No Blocked Development**: Team can continue development without infrastructure
2. **Cost Control**: No premature infrastructure costs during development
3. **Gradual Rollout**: Infrastructure can be added incrementally
4. **Clear Feedback**: Always know what's missing to enable deployments
5. **Mock Testing**: Validate deployment logic before infrastructure exists

## Common Scenarios

### Scenario 1: Feature Development

**Status**: Infrastructure not ready
**Action**: 
- Develop features locally
- Tests run in mock mode
- Deployments are skipped automatically
- No infrastructure costs incurred

### Scenario 2: Testing Deployment Scripts

**Status**: Infrastructure not ready
**Action**:
- Use manual workflow with `force_deploy: true`
- Deployment will attempt and likely fail
- Useful for validating deployment script logic
- Review logs for script issues

### Scenario 3: Infrastructure Ready

**Status**: Infrastructure ready
**Action**:
- Infrastructure check passes automatically
- Real deployments proceed to staging/production
- Environment tests run against actual deployed applications
- Full CI/CD pipeline operational

## Troubleshooting

### Why Are My Deployments Skipped?

**Reason**: Infrastructure not ready
**Solution**: This is expected behavior. Continue development or set up infrastructure.

### How Do I Test Deployment Logic?

**Solution**: Use manual workflow with `force_deploy: true` option.

### When Will Deployments Be Enabled?

**Timeline**: After infrastructure setup is completed (see Phase 2 above).

### Can I Speed Up Infrastructure Setup?

**Options**:
1. Review deployment preparation checklist
2. Prioritize AWS account and domain setup
3. Use staging environment first for testing

## Next Steps

1. **Continue Development**: Build features without infrastructure dependency
2. **Infrastructure Planning**: Review deployment preparation checklist
3. **Timeline Planning**: Determine when infrastructure setup should begin
4. **Testing Strategy**: Use mock tests to validate functionality

This infrastructure-aware approach ensures the CI/CD pipeline provides value throughout the development lifecycle, regardless of infrastructure readiness. 