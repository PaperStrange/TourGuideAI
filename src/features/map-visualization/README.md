# Map Visualization Feature

This feature handles the mapping and geographic visualization of travel routes, points of interest, and navigation.

## Components

- **InteractiveMap**: Main map interface with controls and overlays
- **MapControls**: UI controls for map interaction (zoom, pan, layers)
- **PointOfInterest**: Component for displaying and interacting with points on the map
- **RouteDisplay**: Component for displaying travel routes with waypoints

## Services

- **LocationService**: Handles geocoding and location search functionality
- **DirectionsService**: Manages travel directions and routing
- **PlacesService**: Manages points of interest and location details

## Functionality

- Interactive map navigation
- Visualization of travel routes and itineraries
- Discovery of nearby points of interest
- Distance and travel time calculations
- Geographic search and filtering

## Performance Optimizations

- **Lazy Loading**: The map component is loaded on-demand using React.lazy
- **Progressive Loading**: Map markers and routes are loaded progressively based on viewport
- **Image Optimization**: Map POI images use responsive loading and WebP format
- **Caching**: Geographic data is cached with location-specific TTL values
- **Offline Support**: Previously viewed maps and routes are available offline

## Dependencies

This feature depends on:
- Google Maps API (via `core/api/googleMapsApi`)
- Storage services (via `core/services/storage`)
- Common UI components (via `core/components`) 