# Version Numbering Convention

This document defines the version numbering system used in the TourGuideAI project.

## Semantic Versioning

TourGuideAI follows [Semantic Versioning 2.0.0](https://semver.org/) with the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incremented for incompatible API changes or significant UI/UX redesigns
- **MINOR**: Incremented for backward-compatible new functionality
- **PATCH**: Incremented for backward-compatible bug fixes

## Version Stages

### Development Versions (0.x.y)
- Projects in initial development use 0.x.y versioning
- API and functionality may change without warning
- Breaking changes can occur in minor version increments

### Stable Versions (≥1.0.0)
- Public APIs declared stable
- Breaking changes only in major version increments
- New features added in minor version increments
- Bug fixes in patch version increments

## Version Qualifiers

When needed, version qualifiers may be appended with a hyphen:

- **ALPHA**: Early testing versions with incomplete features
  - Example: `1.0.0-ALPHA1`
  - May have breaking changes between alpha releases

- **BETA**: Feature-complete versions undergoing testing
  - Example: `1.0.0-BETA2`
  - APIs generally stable but may have changes based on feedback

- **RC**: Release Candidates ready for final testing
  - Example: `1.0.0-RC1`
  - No new features, only bug fixes expected

- **SNAPSHOT**: Development builds not intended for release
  - Example: `1.0.0-SNAPSHOT`
  - Used only for internal development and testing

## Example Version Progression

```
0.1.0 → Initial prototype
0.2.0 → Additional features
0.2.1 → Bug fixes
0.3.0 → More features
0.4.0 → Major feature update
0.4.1 → Bug fixes and refinements
1.0.0-ALPHA1 → First alpha release
1.0.0-ALPHA2 → Second alpha release
1.0.0-BETA1 → First beta release
1.0.0-RC1 → First release candidate
1.0.0 → Stable release
1.1.0 → New features added
1.1.1 → Bug fixes
2.0.0 → Breaking changes
```

## Version Control Integration

- Each released version should be tagged in Git
- Tag format: `v{version}` (e.g., `v1.0.0`, `v1.0.0-BETA1`)
- Branches should follow naming convention related to versions:
  - `develop` - Main development branch
  - `release/1.0.0` - Release preparation branch
  - `hotfix/1.0.1` - Hotfix branch

## Documentation

For each version:
- Update `project.versions.md` with detailed release notes
- Update relevant README files
- Document any breaking changes prominently
- Include migration guides when necessary

## Version Bumping Guidelines

- **MAJOR**: Bump when making incompatible API changes
  - Changing the signature of public methods
  - Removing or renaming public methods/properties
  - Major UI/UX redesigns
  - Changing database schemas in non-backward-compatible ways

- **MINOR**: Bump when adding functionality in a backward-compatible manner
  - Adding new features
  - Adding new API methods
  - Adding new UI components
  - Deprecating (but not removing) functionality

- **PATCH**: Bump when making backward-compatible bug fixes
  - Bug fixes that don't change the API
  - Performance improvements
  - Documentation updates
  - Dependency updates without functional changes

## Release Process

1. Determine appropriate version number based on changes
2. Update version number in:
   - `package.json`
   - Any version constants in code
   - Documentation
3. Update `project.versions.md` with release notes
4. Tag the release in version control
5. Create release artifacts

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [npm Semantic Versioning](https://docs.npmjs.com/about-semantic-versioning)
- [Conventional Commits](https://www.conventionalcommits.org/) 