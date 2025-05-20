# Migration Plan: Move from Create React App (CRA) to Vite or Next.js

## Rationale

Persistent security vulnerabilities in transitive dependencies (e.g., nth-check via react-scripts) cannot be resolved without breaking changes. CRA is no longer actively maintained for modern security needs. Migrating to Vite or Next.js will:
- Eliminate legacy dependency vulnerabilities
- Improve build speed and developer experience
- Enable more flexible configuration and modern features
- Align with project security and maintainability goals

## High-Level Steps

1. **Audit Current Dependencies and Features**
   - List all dependencies, scripts, and custom configurations in the current CRA setup
   - Identify any custom Webpack, Babel, or environment settings

2. **Select Target Build System**
   - Evaluate Vite and Next.js for project fit (SSR, routing, etc.)
   - Decide on Vite (for SPA) or Next.js (for SSR/SSG needs)

3. **Set Up New Project Structure**
   - Initialize a new Vite or Next.js project in a separate branch or directory
   - Configure TypeScript, ESLint, Prettier, and other tooling as needed

4. **Migrate Source Code**
   - Copy src/ and public/ assets to the new project
   - Update import paths, environment variables, and entry points as required
   - Refactor any CRA-specific code (e.g., service worker, index.js)

5. **Migrate and Update Build/Test Scripts**
   - Update package.json scripts for build, start, test, and deploy
   - Remove react-scripts and related dependencies
   - Ensure patch-package and overrides are no longer needed for nth-check

6. **Test Thoroughly**
   - Run all unit, integration, and E2E tests
   - Validate all features, routes, and environment configurations
   - Fix any issues with static assets, routing, or environment variables

7. **Update Documentation**
   - Document new build/test/deploy processes
   - Update onboarding and developer guides
   - Reference this migration in project.lessons.md and refactors.md

8. **Deploy and Monitor**
   - Deploy to staging and production
   - Monitor for regressions or new issues

## Risks and Mitigations

- **Dependency mismatches**: Audit and test all dependencies for compatibility
- **Build or runtime errors**: Use incremental migration and thorough testing
- **Team onboarding**: Update documentation and provide migration guides
- **CI/CD pipeline changes**: Update workflows and scripts for new build system

## References
- See Security & Build Lessons (2025-05-18) in project.lessons.md
- See TODO and Milestone entries for migration tracking
- See project.refactors.md for rationale and audit trail

---
*Last updated: 2025-05-18* 