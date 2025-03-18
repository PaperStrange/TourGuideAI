import React, { useState } from 'react';
import TimelineComponent from '../components/Timeline/TimelineComponent';

/**
 * Demo page to showcase the Timeline component with sample data
 */
const TimelineDemoPage = () => {
  // Sample route data
  const [route] = useState({
    route_name: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    duration: 3,
    start_date: "2023-11-15",
    end_date: "2023-11-18",
    overview: "Experience the best of Tokyo with this 3-day adventure through Japan's vibrant capital.",
    highlights: [
      "Tokyo Skytree",
      "Sensō-ji Temple",
      "Shibuya Crossing",
      "Meiji Shrine",
      "Akihabara"
    ]
  });

  // Sample timeline data
  const [timeline] = useState({
    days: [
      {
        travel_day: 1,
        current_date: "Nov 15, 2023",
        daily_routes: [
          {
            time: "9:00 AM",
            activity: "Breakfast at Hotel",
            location: "Shinjuku",
            duration: "1 hour",
            transportation: "None",
            cost: "$15",
            notes: "Japanese breakfast buffet included with hotel stay"
          },
          {
            time: "10:30 AM",
            activity: "Visit Sensō-ji Temple",
            location: "Asakusa",
            duration: "2 hours",
            transportation: "Subway",
            cost: "$5",
            notes: "One of Tokyo's oldest and most significant temples"
          },
          {
            time: "1:00 PM",
            activity: "Lunch at Tempura Restaurant",
            location: "Asakusa",
            duration: "1 hour",
            transportation: "Walking",
            cost: "$20",
            notes: "Try the tempura set meal for an authentic experience"
          },
          {
            time: "3:00 PM",
            activity: "Tokyo Skytree",
            location: "Sumida",
            duration: "2 hours",
            transportation: "Walking",
            cost: "$30",
            notes: "Get tickets in advance to avoid long lines"
          },
          {
            time: "7:00 PM",
            activity: "Dinner at Izakaya",
            location: "Shinjuku",
            duration: "2 hours",
            transportation: "Subway",
            cost: "$35",
            notes: "Traditional Japanese pub with variety of small dishes"
          }
        ]
      },
      {
        travel_day: 2,
        current_date: "Nov 16, 2023",
        daily_routes: [
          {
            time: "9:30 AM",
            activity: "Explore Meiji Shrine",
            location: "Shibuya",
            duration: "2 hours",
            transportation: "Subway",
            cost: "Free",
            notes: "Beautiful shrine surrounded by forest in the heart of Tokyo"
          },
          {
            time: "12:00 PM",
            activity: "Harajuku Shopping",
            location: "Harajuku",
            duration: "2 hours",
            transportation: "Walking",
            cost: "Varies",
            notes: "Famous for youth fashion and quirky stores"
          },
          {
            time: "2:30 PM",
            activity: "Shibuya Crossing",
            location: "Shibuya",
            duration: "1 hour",
            transportation: "Walking",
            cost: "Free",
            notes: "World's busiest pedestrian crossing"
          },
          {
            time: "4:00 PM",
            activity: "Visit Shibuya Sky",
            location: "Shibuya",
            duration: "2 hours",
            transportation: "Walking",
            cost: "$20",
            notes: "Amazing 360° view of Tokyo"
          },
          {
            time: "7:30 PM",
            activity: "Dinner at Ramen Shop",
            location: "Shibuya",
            duration: "1 hour",
            transportation: "Walking",
            cost: "$15",
            notes: "Try tonkotsu or miso ramen"
          }
        ]
      },
      {
        travel_day: 3,
        current_date: "Nov 17, 2023",
        daily_routes: [
          {
            time: "10:00 AM",
            activity: "Akihabara Electric Town",
            location: "Akihabara",
            duration: "3 hours",
            transportation: "Subway",
            cost: "Varies",
            notes: "Paradise for anime, manga, and electronics fans"
          },
          {
            time: "1:30 PM",
            activity: "Lunch at Maid Café",
            location: "Akihabara",
            duration: "1.5 hours",
            transportation: "Walking",
            cost: "$25",
            notes: "Unique Japanese pop culture experience"
          },
          {
            time: "4:00 PM",
            activity: "Imperial Palace Gardens",
            location: "Chiyoda",
            duration: "2 hours",
            transportation: "Subway",
            cost: "Free",
            notes: "Beautiful gardens surrounding the Imperial Palace"
          },
          {
            time: "7:00 PM",
            activity: "Farewell Dinner at Sukiyaki Restaurant",
            location: "Ginza",
            duration: "2 hours",
            transportation: "Subway",
            cost: "$60",
            notes: "Traditional hot pot dish with thinly sliced beef"
          }
        ]
      }
    ]
  });

  return (
    <div className="timeline-demo-page">
      <header className="demo-header">
        <h1>Travel Itinerary Timeline</h1>
        <p>Interactive visualization of your travel plan</p>
      </header>
      
      <main className="demo-content">
        <TimelineComponent route={route} timeline={timeline} />
      </main>
      
      <style jsx>{`
        .timeline-demo-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .demo-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .demo-header h1 {
          font-size: 2.2rem;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .demo-header p {
          font-size: 1.1rem;
          color: #7f8c8d;
        }
        
        .demo-content {
          background-color: #f9f9f9;
          border-radius: 12px;
          padding: 2rem;
        }
        
        @media (max-width: 768px) {
          .timeline-demo-page {
            padding: 1rem;
          }
          
          .demo-content {
            padding: 1rem;
            border-radius: 8px;
          }
          
          .demo-header h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TimelineDemoPage; 