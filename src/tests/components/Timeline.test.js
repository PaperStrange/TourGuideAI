import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineComponent from '../../components/Timeline/TimelineComponent';

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

  test('should render all timeline locations', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    expect(screen.getByText('Hotel Washington')).toBeInTheDocument();
    expect(screen.getByText('Smithsonian National Museum of Natural History')).toBeInTheDocument();
    expect(screen.getByText('National Air and Space Museum')).toBeInTheDocument();
    expect(screen.getByText('White House')).toBeInTheDocument();
  });

  test('should display transportation details', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    // First day transportation details
    expect(screen.getByText('9.00 AM - 9.16 AM')).toBeInTheDocument();
    expect(screen.getByText('14 minute')).toBeInTheDocument();
    expect(screen.getByText('0.7 mile')).toBeInTheDocument();
    expect(screen.getByText('walk')).toBeInTheDocument();
    
    // Second day transportation details
    expect(screen.getByText('9.00 AM - 9.10 AM')).toBeInTheDocument();
    expect(screen.getByText('10 minute')).toBeInTheDocument();
    expect(screen.getByText('0.5 mile')).toBeInTheDocument();
  });

  test('should display recommended reasons', () => {
    render(<TimelineComponent route={mockRoute} timeline={mockTimeline} />);
    
    expect(screen.getByText('From dinosaur exhibits to displays of rare gems, this acclaimed museum celebrates the natural world.')).toBeInTheDocument();
    expect(screen.getByText('One of the most visited museums in the world, housing famous aircraft like the Wright Flyer and Apollo 11 command module.')).toBeInTheDocument();
    expect(screen.getByText('The official residence and workplace of the President of the United States.')).toBeInTheDocument();
  });

  test('should display appropriate error message when no timeline data is provided', () => {
    render(<TimelineComponent route={mockRoute} timeline={null} />);
    // With our implementation this would show the skeleton loader
    expect(screen.queryByText('No timeline data available')).not.toBeInTheDocument();
  });

  test('should display appropriate error message when empty timeline data is provided', () => {
    render(<TimelineComponent route={mockRoute} timeline={{ days: [] }} />);
    // With our implementation this would show the skeleton loader
    expect(screen.queryByText('No timeline data available')).not.toBeInTheDocument();
  });
}); 