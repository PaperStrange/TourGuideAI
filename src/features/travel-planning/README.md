# Travel Planning Feature

This feature handles the travel itinerary planning functionality, allowing users to generate and customize travel plans.

## Components

- **RouteGenerator**: UI for generating travel routes from user queries
- **ItineraryBuilder**: Interface for customizing and fine-tuning travel itineraries
- **RoutePreview**: Quick preview of generated routes

## Services

- **RouteGenerationService**: Handles communication with OpenAI for route generation
- **RouteManagementService**: Manages saving, editing, and updating routes

## Functionality

- Natural language processing of travel queries
- Generation of personalized travel routes
- Customization of generated itineraries
- Saving and managing travel plans

## Dependencies

This feature depends on:
- OpenAI API (via `core/api/openaiApi`)
- Storage services (via `core/services/storage`)
- Common UI components (via `core/components`) 