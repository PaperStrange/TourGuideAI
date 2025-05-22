import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineComponent from './TimelineComponent';

// Mock the DayCard component
jest.mock('./DayCard', () => {
  return function MockDayCard({ day, destination }) {
    return (
      <div data-testid="day-card">
        <div data-testid="day-number">Day {day.travel_day}</div>
        <div data-testid="day-destination">{destination}</div>
      </div>
    );
  };
});

describe('TimelineComponent', () => {
  const mockRoute = {
    route_name: "Test Route",
    destination: "Test Destination",
    duration: 3,
    overview: "Test overview"
  };
  
  const mockTimeline = {
    days: [
      {
        travel_day: 1,
        current_date: "Day 1",
        daily_routes: [
          { time: "9:00 AM", activity: "Activity 1" }
        ]
      },
      {
        travel_day: 2,
        current_date: "Day 2",
        daily_routes: [
          { time: "10:00 AM", activity: "Activity 2" }
        ]
      },
      {
        travel_day: 3,
        current_date: "Day 3",
        daily_routes: [
          { time: "11:00 AM", activity: "Activity 3" }
        ]
      }
    ]
  };

  test('renders loading skeleton when timeline is not available', () => {
    render(<TimelineComponent route={mockRoute} timeline={{}} />);
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
  });

  test('renders the timeline when data is available', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    // Title should show destination
    expect(screen.getByText(`Your Itinerary for ${mockRoute.destination}`)).toBeInTheDocument();
    
    // Subtitle should show days count and route name
    expect(screen.getByText(`${mockTimeline.days.length} days • ${mockRoute.route_name}`)).toBeInTheDocument();
    
    // Navigation buttons for each day should be present
    mockTimeline.days.forEach((day, index) => {
      expect(screen.getByText(`Day ${day.travel_day}`)).toBeInTheDocument();
    });
    
    // Initial day card should be for day 1
    expect(screen.getByTestId('day-number')).toHaveTextContent('Day 1');
  });

  test('changes day when navigation button is clicked', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    // Initial day is day 1
    expect(screen.getByTestId('day-number')).toHaveTextContent('Day 1');
    
    // Click day 2 button
    fireEvent.click(screen.getByText('Day 2'));
    
    // Day card should now be for day 2
    expect(screen.getByTestId('day-number')).toHaveTextContent('Day 2');
    
    // Click day 3 button
    fireEvent.click(screen.getByText('Day 3'));
    
    // Day card should now be for day 3
    expect(screen.getByTestId('day-number')).toHaveTextContent('Day 3');
  });

  test('handles empty timeline gracefully', () => {
    const emptyTimeline = { days: [] };
    render(<TimelineComponent route={mockRoute} timeline={emptyTimeline} />);
    
    // Should still render the title
    expect(screen.getByText(`Your Itinerary for ${mockRoute.destination}`)).toBeInTheDocument();
    
    // Should show 0 days
    expect(screen.getByText(`0 days • ${mockRoute.route_name}`)).toBeInTheDocument();
  });
}); 