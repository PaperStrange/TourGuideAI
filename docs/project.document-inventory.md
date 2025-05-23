# TourGuideAI Documentation Inventory

This document tracks all documentation artifacts in the TourGuideAI project, serving as a central reference for what documentation exists and where to find it.

## Project Management Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/pics/flowchart/.mermaidworkflow` | Visual representation of project workflow | When workflow process changes |
| `docs/pics/flowchart/.mermaidfilesmap` | Visual representation of documentation relationships | When document structure changes |

## Process Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/project_lifecycle/process_monitors/records/project.workflow-checklists.md` | Checklists for tracking workflow completion | At phase start and when procedures are finished |
| `docs/project.document-inventory.md` | This file - inventory of all documentation | When documentation is added or modified |
| `docs/project_lifecycle/process_monitors/records/project.phase-signoff.md` | Formal phase completion verification records | At phase completion |
| `docs/project_lifecycle/process_monitors/plans/phase6-beta-release-plan.md` | Phase 6 beta release plan | At phase start |
| `docs/project_lifecycle/process_monitors/plans/phase7-post-beta-enhancements-plan.md` | Phase 7 post-beta enhancements plan | At phase start |
| `docs/project_lifecycle/version_control/records/project.rc.1.0.0.release-plan.md` | Phase 8 online launch plan | At Phase 8 start |
| `docs/project_lifecycle/process_monitors/implementation_summary.md` | Summary of implementation progress | When implementation status changes |
| `docs/project_lifecycle/version_control/records/project.versions.md` | Version history and release notes | After version completion |
| `docs/project_lifecycle/version_control/records/project.beta.0.5.0-1.release-checklist.md` | Checklist for beta release deployment | During beta release preparation |
| `docs/project_lifecycle/version_control/records/project.beta.0.5.0-1.beta-tester-guide.md` | Guide for beta testers | Before beta release and when beta program changes |
| `docs/project_lifecycle/code_and_project_structure_refactors/plans/project.refactors.overall-plan.md` | Refactoring categorization and approach | Before refactoring, quarterly review |
| `docs/project_lifecycle/knowledge/project.lessons.md` | Centralized location for all project lessons | After resolving challenges or insights |

## Development Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/project_lifecycle/deployment/pipelines/project.deployment-pipeline.md` | Deployment process documentation | Before production release |
| `docs/project_lifecycle/deployment/plans/project.deployment-pipeline-plan.md` | Detailed deployment strategy | Before deployment pipeline implementation |
| `docs/project_lifecycle/deployment/plans/project.performance-optimization-plan.md` | Performance strategy and targets | Before optimization work |
| `docs/project_lifecycle/deployment/plans/project.performance-implementation-plan.md` | Implementation details for performance | Before performance feature implementation |
| `docs/project_lifecycle/deployment/plans/project.cdn-implementation-plan.md` | CDN implementation strategy with CI/CD integration | Updated with CDN implementation progress |
| `docs/project_lifecycle/deployment/records/project.cdn-implementation-summary.md` | Summary of implemented CDN components | When CDN implementation changes |
| `docs/project_lifecycle/code_and_project_structure_refactors/plans/project.refactors.cdn-plan.md` | Plan for CDN code refactoring | Before CDN refactoring work |
| `docs/project_lifecycle/code_and_project_structure_refactors/records/project.refactors.cdn-completed.md` | Documentation of completed CDN refactors | After CDN refactoring |
| `models/README.md` | Documentation for AI models and resources | When model architecture changes |
| `tourai_platform/README.md` | Documentation for TourAI platform | When platform functionality changes |
| `scripts/run-security-audit.js` | Script for running security scans with OWASP ZAP or in mock mode | When security scanning process changes |
| `scripts/deploy-to-cdn.js` | Script for deploying assets to CDN | When CDN deployment process changes |

## Testing Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/project_lifecycle/all_tests/plans/project.tests.frontend-plan.md` | Comprehensive frontend testing strategy | When frontend test approach changes |
| `docs/project_lifecycle/all_tests/plans/project.tests.backend-plan.md` | Comprehensive backend testing strategy | When backend test approach changes |
| `docs/project_lifecycle/all_tests/results/project.test-execution-results.md` | Test execution status and next steps | After each test run |
| `docs/project_lifecycle/all_tests/results/test-results-summary.md` | Summary of test results | After test completion |
| `docs/project_lifecycle/all_tests/results/project.tests.frontend-results-template.md` | Template for frontend test execution results | Used to create date-specific result files |
| `docs/project_lifecycle/all_tests/results/project.tests.backend-results-template.md` | Template for backend test execution results | Used to create date-specific result files |
| `docs/project_lifecycle/all_tests/results/coverage-report.md` | Test coverage metrics and trends | After each test run |
| `docs/project_lifecycle/all_tests/references/project.test-scenarios.md` | Detailed test scenarios with metrics | Before feature implementation |
| `docs/project_lifecycle/all_tests/references/project.test-user-story.md` | Mock user journeys for testing | Before feature implementation |
| `docs/project_lifecycle/all_tests/references/test-user-stories.md` | User stories for test scenario generation | Updated as features evolve |
| `docs/project_lifecycle/all_tests/references/project.tests.test-patterns.md` | Standard test patterns and conventions | When test patterns evolve |
| `docs/project_lifecycle/all_tests/references/project.tests.mock-strategies.md` | Documentation of mocking approaches for services | When mock strategies change |
| `docs/project_lifecycle/all_tests/references/project.test_organization.md` | Guide to test organization in the project | When test structure changes |
| `docs/project_lifecycle/all_tests/results/stability-test/README.md` | Information about stability test results | When stability test structure changes |
| `docs/project_lifecycle/all_tests/results/sync-service/README.md` | Information about SyncService test results | When SyncService test structure changes |
| `docs/project_lifecycle/all_tests/results/user-journey/README.md` | Information about user journey test results | When user journey test structure changes |
| `docs/project_lifecycle/all_tests/results/security-reports/README.md` | Information about security scanning and reports | When security scanning process changes |
| `docs/project_lifecycle/all_tests/README.md` | Main test documentation overview | When test structure changes |
| `tests/README.md` | Main test suite documentation | When test structure changes |
| `tests/smoke/README.md` | Smoke tests documentation | When smoke tests change |
| `tests/cross-browser/README.md` | Cross-browser tests documentation | When cross-browser tests change |
| `tests/load/README.md` | Load tests documentation | When load tests change |
| `tests/security/README.md` | Security tests documentation | When security tests change |
| `tests/all_tests/README.md` | All tests documentation including stability tests | When stability tests change |
| `tests/config/README.md` | Test configuration documentation | When test configuration changes |

## Test-Driven Refactoring Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/project_lifecycle/code_and_project_structure_refactors/plans/project.refactors.test-driven.md` | Planning for test-driven refactoring | Before refactoring |
| `docs/project_lifecycle/code_and_project_structure_refactors/records/project.refactors.test-driven-completed.md` | Documentation of completed test-driven refactors | After refactoring |
| `docs/project_lifecycle/code_and_project_structure_refactors/references/refactoring-patterns.md` | Reference patterns for improving testability | Updated as patterns evolve |

## Prototype Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/prototype/user_profile.json` | Prototype data for user profiles | When UI prototypes change |
| `docs/prototype/chat_page.json` | Prototype data for chat interface | When UI prototypes change |
| `docs/prototype/map_page_elements.json` | Prototype data for map visualization | When UI prototypes change |

## Reference Documentation

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/pics/flowchart/README.md` | Information about project diagrams and how to use them | When diagram structure changes |
| `docs/pics/screenshots/README.md` | Information about project screenshots | When screenshot collection changes |
| `docs/pics/flowchart/project_documentation_map.svg` | SVG visualization of documentation structure | When documentation structure changes |
| `docs/pics/flowchart/project_workflow.png` | PNG image of project workflow | When workflow process changes |
| `docs/project_lifecycle/code_and_project_structure_refactors/references/code-review-checklist.md` | Standard for code reviews | Reference during review |
| `docs/project_lifecycle/version_control/references/version-control.md` | Versioning conventions | Reference during releases |
| `docs/project_lifecycle/code_and_project_structure_refactors/references/dependencies-tracking.md` | Component dependency management | Update with architectural changes |
| `docs/project_lifecycle/code_and_project_structure_refactors/references/whats-code-review-looking-for.md` | Google's code review guide | Reference during reviews |
| `.github/workflows/ci-cd.yml` | GitHub Actions CI/CD workflow definition | When deployment processes change |

## Technical Documentation

- [ux-audit-system.md](project_lifecycle/knowledge/project.lessons.md#ux-audit-system)

## Document Update Process

1. When creating a new document:
   - Check this inventory to see if a similar document already exists
   - Use consistent naming conventions (`project.category-purpose.md`)
   - Update this inventory to include the new document

2. When updating a document:
   - Ensure changes align with the stated purpose of the document
   - Update any linked or related documents to maintain consistency

3. Document review should be performed:
   - At the end of each development phase
   - When making significant architectural changes
   - Before release milestones
