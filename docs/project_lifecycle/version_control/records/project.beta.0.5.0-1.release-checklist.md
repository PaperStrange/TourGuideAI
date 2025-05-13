# TourGuideAI 0.5.0-BETA1 Release Checklist

*Last Updated: April 19, 2023*

## Pre-Release Tasks
- [x] Update version number in package.json to 0.5.0-BETA1
- [x] Update project.versions.md with release notes for 0.5.0-BETA1
- [x] Create Git tag for the release: v0.5.0-BETA1
- [ ] Perform build verification
- [ ] Address critical known issues:
  - [ ] React 18 compatibility issues in frontend tests
  - [ ] JWT token validation issues in authentication tests
  - [ ] Service mocking issues in analytics component tests

## Testing
- [ ] Run selective tests that are known to work
- [ ] Perform manual verification of core features:
  - [ ] Authentication functionality
  - [ ] Route planning
  - [ ] User profile management
  - [ ] Beta program analytics dashboard
  - [ ] Feedback collection mechanisms
- [ ] Run smoke tests: `npm run test:smoke`

## Documentation
- [x] Update README.md with beta program information
- [x] Create beta tester onboarding guide (docs/beta-tester-guide.md)
- [ ] Update API documentation for beta functionality

## Deployment
- [x] Update deploy.sh script to support beta environment
- [x] Create .env.beta configuration file
- [x] Set beta-specific feature flags (src/config/featureFlags.js)
- [x] Test beta deployment script: `./scripts/deploy.sh beta dry-run`
- [ ] Configure beta user access controls
- [ ] Set up analytics for beta program monitoring
- [ ] Configure feedback collection endpoints
- [ ] Perform actual beta deployment: `./scripts/deploy.sh beta`

## Post-Release
- [ ] Monitor system stability
- [ ] Collect and categorize initial feedback
- [ ] Schedule follow-up release planning meeting
- [ ] Create tickets for issues discovered during beta
- [ ] Set up beta tester community forum
- [ ] Configure beta tester invitation system
- [ ] Send invitation emails to selected beta testers 