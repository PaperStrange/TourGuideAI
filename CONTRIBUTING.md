# Contributing to TourGuideAI

We love your input! We want to make contributing to TourGuideAI as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Follow the project workflow in `.cursor/.workflows`.
3. Ensure all tests pass before submitting changes.
4. Update relevant documentation.
5. Issue that pull request!

## Development Workflow

Please follow the structured development workflow documented in `.cursor/.workflows`:

1. **Phase Initialization**
   - Review project structure and requirements
   - Set up milestones and tasks
   - Create necessary documentation

2. **Development Process**
   - Execute tasks according to priorities
   - Regular updates to project status
   - Continuous testing and validation

3. **Phase Completion**
   - Comprehensive code review
   - Documentation updates
   - Test execution and validation

## Code Style

Follow the existing code style in the project. Some key points:

- Use consistent naming conventions (camelCase for variables and functions, PascalCase for components)
- Write clear, descriptive comments
- Keep functions small and focused on a single responsibility
- Use TypeScript typing where appropriate
- Follow React best practices for component structure

## Testing

- Write tests for all new features
- Ensure all tests pass before submitting a pull request
- Follow the testing strategy outlined in `docs/project_lifecycle/all_tests/plans/project.tests.frontend-plan.md`
- For UX-related changes, use the UX audit system to validate improvements

### Best Practices for User Journey Tests

When working with user journey tests:

- Use data-testid attributes for reliable element selection
- Ensure proper template string syntax when using variables (e.g., use backticks: `${variable}`)
- Use specific selectors when targeting potentially duplicate elements
- Properly format URLs in navigation tests with template literals
- Update persona scenarios when adding new features that affect the user journey
- Refer to the detailed documentation in `docs/project_lifecycle/all_tests/results/user-journey/README.md`

## UX Audit System

When making UI/UX changes, leverage our UX audit system to validate improvements:

- Use session recordings to understand how users interact with the feature
- Check heatmaps to identify usability issues in the current implementation
- Validate improvements using UX metrics evaluation
- Document UX insights in `docs/project_lifecycle/knowledge/project.lessons.md` under the relevant feature section

The UX audit system is documented in `docs/project_lifecycle/knowledge/project.lessons.md#ux-audit-system`.

## Documentation

Update documentation to reflect any changes you make:

- Update relevant README files
- Add JSDoc comments to functions and components
- Update API documentation if endpoints change
- Record lessons learned in `docs/project_lifecycle/knowledge/project.lessons.md`
- For UX changes, include before/after metrics from the UX audit system

## Code Review

All submissions require review. We use GitHub pull requests for this purpose:

1. Create a pull request from your forked repository
2. Maintainers will review your code
3. Address any feedback from the review
4. Once approved, a maintainer will merge your changes

## Issue Reporting

When reporting issues, please use the issue templates provided and include:

- A clear and descriptive title
- Steps to reproduce the problem
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment information (browser, OS, etc.)
- For UX issues, reference to any relevant session recordings or heatmaps

## Community

- Be respectful and inclusive in discussions
- Help others who have questions
- Share knowledge and insights

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
