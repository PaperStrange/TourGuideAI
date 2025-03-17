# TourGuideAI - Phase 2 Testing Plan

## Overview
This document outlines the testing approach for verifying all components, functionality, and interactive requirements of the TourGuideAI application.

## Testing Approach
Since we cannot deploy the application locally without Node.js, we'll conduct a code-based review to verify that all requirements have been implemented correctly.

## Chat Page Testing

### Elements to Verify
1. **Title Element (element_id: 1)**
   - ✅ Text displays "Your personal tour guide!"
   - ✅ Styled appropriately

2. **Input Box (element_id: 2)**
   - ✅ Allows multi-line input with auto-wrap
   - ✅ Auto-scroll functionality
   - ✅ State updates on user input

3. **Generate Button (element_id: 3)**
   - ✅ Displays text "Generate your first plan!"
   - ✅ Located at the bottom of the input box
   - ✅ Disabled when input is empty
   - ✅ Calls user_route_generate function on click
   - ✅ Shows loading state during generation

4. **Feel Lucky Button (element_id: 4)**
   - ✅ Displays text "Feel lucky?"
   - ✅ Located at the bottom of the input box
   - ✅ Disabled when input is empty
   - ✅ Calls user_route_generate_randomly function on click
   - ✅ Shows loading state during generation

5. **Live Pop-up Window (element_id: 5)**
   - ✅ Displays user profile picture
   - ✅ Shows route name summarized by AI
   - ✅ Pop-up background has random color
   - ✅ Clicking navigates to Map page

6. **Route Rankboard (element_id: 6)**
   - ✅ Displays routes sorted by upvotes
   - ✅ Top three routes have medal frames
   - ✅ User profile and nickname shown for top three
   - ✅ Upvote number displayed in circle at upper right
   - ✅ Other ranks show rank number, route name, and upvotes
   - ✅ Clicking navigates to Map page

## Map Page Testing

### Elements to Verify
1. **Map Preview Windows (element_id: 1)**
   - ✅ Integrates with Google Maps API
   - ✅ Displays AI generated routes
   - ✅ Highlights nearby interest points
   - ✅ Shows info windows when clicking on markers

2. **User Input Box (element_id: 2)**
   - ✅ Displays user query
   - ✅ Shows different parts in different colors
   - ✅ Properly formats recognized intent

3. **Route Timeline (element_id: 3)**
   - ✅ Displays timeline in vertical style grouped by day
   - ✅ Each day includes arranged sites and transportation info
   - ✅ Shows departure/arrival times in current timezone
   - ✅ Displays transportation type, duration, distance
   - ✅ Includes short introduction for each site

## User Profile Page Testing

### Elements to Verify
1. **User Name (element_id: 1)**
   - ✅ Displays user name properly
   - ✅ Styled appropriately

2. **User Profile Media (element_id: 2)**
   - ✅ Displays user profile image
   - ✅ Properly sized and styled

3. **Routes Board (element_id: 3)**
   - ✅ Displays all user generated routes as cards
   - ✅ Allows sorting by created time, upvotes, views, or sites
   - ✅ Clicking navigates to Map page
   - ✅ Shows route details including duration, cost, etc.

## API Function Calls Testing

### Chat Page Functions
- ✅ user_route_generate function
- ✅ user_route_generate_randomly function

### Map Page Functions
- ✅ map_real_time_display function
- ✅ get nearby interest point function
- ✅ user_route_split_by_day function
- ✅ user_route_transportation_validation function
- ✅ user_route_interest_points_validation function

### User Profile Page Functions
- ✅ route_statics function
- ✅ rank_route function

## Known Issues & Improvements

1. **Google Maps API Key**
   - Current implementation uses a placeholder API key ("YOUR_GOOGLE_MAPS_API_KEY")
   - In a production environment, a valid API key would be needed

2. **Mock Data**
   - Application currently uses mock data for demonstration
   - Real implementation would need to connect to actual APIs

3. **Error Handling**
   - Additional error handling should be added for API calls
   - User feedback for error states needs improvement

4. **Performance Optimization**
   - Large datasets might cause performance issues
   - Pagination or virtualization could be added for long lists

5. **Responsive Design Improvements**
   - Additional testing on various screen sizes
   - Potential improvements for very small screens

## Next Steps
- Implement fixes for identified issues
- Enhance error handling and user feedback
- Test on different screen sizes and browsers
- Prepare for Phase 3: Collaborative acceptance check 