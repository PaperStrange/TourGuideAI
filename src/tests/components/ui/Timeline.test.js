import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineComponent from '../../../components/Timeline/TimelineComponent';

describe('Timeline Component', () => {
  const mockRoute = {
    destination: 'Washington DC',
    route_name: 'DC Historical Tour'
  };

  const mockTimeline = {
    days: [
      {
        travel_day: 1,
        current_date: '2025/03/10',
        dairy_routes: [
          {
            route_id: 'r001',
            departure_site: 'Hotel Washington',
            arrival_site: 'Smithsonian National Museum of Natural History',
            departure_time: '2025/03/10 9.00 AM(GMT-4)',
            arrival_time: '2025/03/10 9.16 AM(GMT-4)',
            user_time_zone: 'GMT-4',
            transportation_type: 'walk',
            duration: '14',
            duration_unit: 'minute',
            distance: 0.7,
            distance_unit: 'mile',
            recommended_reason: 'From dinosaur exhibits to displays of rare gems, this acclaimed museum celebrates the natural world.'
          },
          {
            route_id: 'r002',
            departure_site: 'Smithsonian National Museum of Natural History',
            arrival_site: 'National Air and Space Museum',
            departure_time: '2025/03/10 11.30 AM(GMT-4)',
            arrival_time: '2025/03/10 11.45 AM(GMT-4)',
            user_time_zone: 'GMT-4',
            transportation_type: 'walk',
            duration: '15',
            duration_unit: 'minute',
            distance: 0.8,
            distance_unit: 'mile',
            recommended_reason: 'One of the most visited museums in the world, housing famous aircraft like the Wright Flyer and Apollo 11 command module.'
          }
        ]
      },
      {
        travel_day: 2,
        current_date: '2025/03/11',
        dairy_routes: [
          {
            route_id: 'r003',
            departure_site: 'Hotel Washington',
            arrival_site: 'White House',
            departure_time: '2025/03/11 9.00 AM(GMT-4)',
            arrival_time: '2025/03/11 9.10 AM(GMT-4)',
            user_time_zone: 'GMT-4',
            transportation_type: 'walk',
            duration: '10',
            duration_unit: 'minute',
            distance: 0.5,
            distance_unit: 'mile',
            recommended_reason: 'The official residence and workplace of the President of the United States.'
          }
        ]
      }
    ]
  };

  test('should render timeline with correct days', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 2')).toBeInTheDocument();
    expect(screen.getByText('2025/03/10')).toBeInTheDocument();
    expect(screen.getByText('2025/03/11')).toBeInTheDocument();
  });

  test('should render timeline with route information', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    expect(screen.getByText('Your Itinerary for Washington DC')).toBeInTheDocument();
    expect(screen.getByText('2 days • DC Historical Tour')).toBeInTheDocument();
  });

  test('should display day navigation buttons', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    // Check day navigation buttons
    expect(screen.getByLabelText('Day 1 - 2025/03/10')).toBeInTheDocument();
    expect(screen.getByLabelText('Day 2 - 2025/03/11')).toBeInTheDocument();
    
    // Check day content
    expect(screen.getByText('Day 1: 2025/03/10')).toBeInTheDocument();
    expect(screen.getByText('Washington DC')).toBeInTheDocument();
  });

  test('should display time periods when no activities are scheduled', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    // Since the mock data doesn't have time fields, activities will be unscheduled
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    expect(screen.getAllByText('No activities scheduled')).toHaveLength(3);
  });

  test('should display skeleton loader when no timeline data is provided', () => {
    const { container } = render(<TimelineComponent route={mockRoute} timeline={null} />);
    // Should show skeleton loader
    expect(container.querySelector('.timeline-container.skeleton')).toBeInTheDocument();
  });

  test('should display skeleton loader when empty timeline data is provided', () => {
    const { container } = render(<TimelineComponent route={mockRoute} timeline={{ days: [] }} />);
    // Should show skeleton loader
    expect(container.querySelector('.timeline-container.skeleton')).toBeInTheDocument();
  });
}); 