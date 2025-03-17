/**
 * TourGuideAPI - Implementation for TourGuideAI
 * 
 * This file provides both:
 * 1. A simulation layer for development/testing
 * 2. Actual OpenAI API integration capability for production
 * 
 * INTEGRATION NOTE: To use the real OpenAI API:
 * - Set useRealOpenAI = true
 * - Configure OPENAI_API_KEY (in a secure way, preferably through environment variables)
 * - Ensure proper error handling and rate limiting
 */

// Configuration
const config = {
    useRealOpenAI: false, // Set to true to use actual OpenAI API
    apiKey: '', // Should be set securely, not directly in code
    model: 'gpt-4o', // OpenAI model to use
    debug: true // Enable debug logging
};

// Creating a namespace for our API
const TourGuideAPI = {};

// Debug logging
function debugLog(message, data) {
    if (config.debug) {
        console.log(`[TourGuideAPI Debug] ${message}`, data || '');
    }
}

// Sample data for our mock API
const mockData = {
    routes: [
        {
            id: 'r1',
            name: "Sarah's Tokyo Adventure",
            location: "Tokyo, Japan",
            days: 7,
            sites: 15,
            cost: 2800,
            upvotes: 245,
            views: 1250,
            created_date: "2023-05-12T10:30:00",
            user: {
                id: 'u1',
                name: 'Sarah Winter',
                avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
            },
            interests: "culture, food, shopping",
            query: "I want to visit Tokyo for a week in spring, focusing on traditional culture, amazing food, and shopping districts."
        },
        {
            id: 'r2',
            name: "Mike's Rome Expedition",
            location: "Rome, Italy",
            days: 5,
            sites: 10,
            cost: 1700,
            upvotes: 198,
            views: 980,
            created_date: "2023-06-03T14:15:00",
            user: {
                id: 'u2',
                name: 'Mike Johnson',
                avatar: 'https://randomuser.me/api/portraits/men/22.jpg'
            },
            interests: "history, architecture, cuisine",
            query: "Planning a 5-day trip to Rome focused on ancient history, architecture, and authentic Italian cuisine."
        },
        {
            id: 'r3',
            name: "Emma's Barcelona Tour",
            location: "Barcelona, Spain",
            days: 4,
            sites: 8,
            cost: 1500,
            upvotes: 156,
            views: 820,
            created_date: "2023-06-15T09:45:00",
            user: {
                id: 'u3',
                name: 'Emma Garcia',
                avatar: 'https://randomuser.me/api/portraits/women/67.jpg'
            },
            interests: "architecture, beaches, nightlife",
            query: "Going to Barcelona for a long weekend. Want to see Gaudi architecture, enjoy beach time, and experience the nightlife."
        },
        {
            id: 'r4',
            name: "Paris Art Tour",
            location: "Paris, France",
            days: 3,
            sites: 7,
            cost: 1200,
            upvotes: 45,
            views: 310,
            created_date: "2023-06-12T11:20:00",
            user: {
                id: 'u4',
                name: 'John Traveler',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
            },
            interests: "art museums, local cuisine",
            query: "I want to visit Paris for 3 days in June, focusing on art museums and local cuisine."
        },
        {
            id: 'r5',
            name: "London Weekend",
            location: "London, UK",
            days: 2,
            sites: 5,
            cost: 950,
            upvotes: 32,
            views: 245,
            created_date: "2023-05-03T16:40:00",
            user: {
                id: 'u4',
                name: 'John Traveler',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
            },
            interests: "historic sites, modern attractions",
            query: "Weekend trip to London to see the main historic sites and some modern attractions."
        },
        {
            id: 'r6',
            name: "Rome Classical Tour",
            location: "Rome, Italy",
            days: 4,
            sites: 9,
            cost: 1500,
            upvotes: 67,
            views: 420,
            created_date: "2023-04-15T08:30:00",
            user: {
                id: 'u4',
                name: 'John Traveler',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
            },
            interests: "ancient ruins, cuisine",
            query: "4 days in Rome to explore ancient ruins and enjoy Italian cuisine."
        },
        {
            id: 'r7',
            name: "Barcelona Beach Vacation",
            location: "Barcelona, Spain",
            days: 5,
            sites: 8,
            cost: 1350,
            upvotes: 41,
            views: 275,
            created_date: "2023-03-22T13:15:00",
            user: {
                id: 'u4',
                name: 'John Traveler',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
            },
            interests: "beaches, architecture, nightlife",
            query: "5 days in Barcelona to enjoy beaches, see Gaudi architecture, and experience nightlife."
        }
    ],
    
    mapData: {
        'r1': {
            route: {
                id: 'r1',
                location: "Tokyo, Japan",
                days: 7,
                interests: "culture, food, shopping"
            },
            markers: [
                { title: "Senso-ji Temple", content: "Ancient Buddhist temple located in Asakusa." },
                { title: "Tokyo Skytree", content: "Broadcasting, restaurant, and observation tower." },
                { title: "Meiji Shrine", content: "Shinto shrine dedicated to Emperor Meiji and Empress Shoken." },
                { title: "Shibuya Crossing", content: "Famous scramble crossing in Shibuya." },
                { title: "Tsukiji Outer Market", content: "Market district adjacent to the former Tsukiji Fish Market." },
                { title: "Akihabara", content: "Electronics and anime shopping district." },
                { title: "Shinjuku Gyoen", content: "Large park with Japanese, English, and French gardens." }
            ]
        },
        'r2': {
            route: {
                id: 'r2',
                location: "Rome, Italy",
                days: 5,
                interests: "history, architecture, cuisine"
            },
            markers: [
                { title: "Colosseum", content: "Ancient Roman amphitheater built of travertine limestone, tuff, and brick-faced concrete." },
                { title: "Roman Forum", content: "A rectangular forum surrounded by the ruins of several important ancient government buildings." },
                { title: "Vatican Museums", content: "Christian and art museums within the Vatican City." },
                { title: "Pantheon", content: "Former Roman temple, now a church, completed by emperor Hadrian." },
                { title: "Trevi Fountain", content: "Baroque-style fountain designed by Italian architect Nicola Salvi." }
            ]
        },
        'r3': {
            route: {
                id: 'r3',
                location: "Barcelona, Spain",
                days: 4,
                interests: "architecture, beaches, nightlife"
            },
            markers: [
                { title: "Sagrada Familia", content: "Large unfinished basilica designed by architect Antoni Gaudí." },
                { title: "Park Güell", content: "Public park system with gardens and architectonic elements designed by Antoni Gaudí." },
                { title: "Casa Batlló", content: "Building redesigned by Antoni Gaudí, a renowned example of Modernisme architecture." },
                { title: "Barceloneta Beach", content: "Popular urban beach in the Barceloneta neighborhood." },
                { title: "La Rambla", content: "Popular tree-lined pedestrian street in central Barcelona." }
            ]
        },
        'r4': {
            route: {
                id: 'r4',
                location: "Paris, France",
                days: 3,
                interests: "art museums, local cuisine"
            },
            markers: [
                { title: "Louvre Museum", content: "World's largest art museum and historic monument in Paris." },
                { title: "Musée d'Orsay", content: "Museum housed in the former Gare d'Orsay railway station." },
                { title: "Eiffel Tower", content: "Wrought-iron lattice tower on the Champ de Mars." },
                { title: "Café de Flore", content: "Historic café in the Saint-Germain-des-Prés area." },
                { title: "Les Papilles", content: "Renowned bistro offering traditional French cuisine." }
            ]
        },
        'r5': {
            route: {
                id: 'r5',
                location: "London, UK",
                days: 2,
                interests: "historic sites, modern attractions"
            },
            markers: [
                { title: "Tower of London", content: "Historic castle on the north bank of the River Thames." },
                { title: "British Museum", content: "Public museum dedicated to human history, art and culture." },
                { title: "Buckingham Palace", content: "London residence and administrative headquarters of the monarch of the United Kingdom." },
                { title: "London Eye", content: "Giant Ferris wheel on the South Bank of the River Thames." }
            ]
        }
    },
    
    timelines: {
        'r1': [
            {
                title: "Day 1: Central Tokyo",
                sites: [
                    {
                        name: "Imperial Palace Gardens",
                        time: "9:00 AM - 11:00 AM",
                        description: "Explore the beautiful gardens surrounding the Imperial Palace, the primary residence of the Emperor of Japan."
                    },
                    {
                        name: "Tsukiji Outer Market",
                        time: "12:00 PM - 2:00 PM",
                        description: "Sample fresh seafood and Japanese delicacies at this famous market."
                    },
                    {
                        name: "Ginza Shopping District",
                        time: "3:00 PM - 6:00 PM",
                        description: "Explore Tokyo's premier shopping district with department stores and boutiques."
                    }
                ],
                transportation: [
                    { type: "Metro", duration: "20 minutes", distance: "Line 3" },
                    { type: "Walk", duration: "15 minutes", distance: "1.2 km" }
                ]
            },
            {
                title: "Day 2: Traditional Tokyo",
                sites: [
                    {
                        name: "Senso-ji Temple",
                        time: "9:00 AM - 11:00 AM",
                        description: "Visit Tokyo's oldest temple in the historic Asakusa district."
                    },
                    {
                        name: "Nakamise Shopping Street",
                        time: "11:00 AM - 12:30 PM",
                        description: "Shop for traditional crafts and snacks along this centuries-old shopping street."
                    },
                    {
                        name: "Tokyo Skytree",
                        time: "2:00 PM - 4:00 PM",
                        description: "Enjoy panoramic views of Tokyo from one of the world's tallest towers."
                    }
                ],
                transportation: [
                    { type: "Walk", duration: "10 minutes", distance: "800 m" },
                    { type: "Metro", duration: "15 minutes", distance: "Line 1" }
                ]
            }
        ],
        'r4': [
            {
                title: "Day 1: Art & Culture",
                sites: [
                    {
                        name: "Louvre Museum",
                        time: "9:00 AM - 1:00 PM",
                        description: "The world's largest art museum and a historic monument in Paris. Home to the Mona Lisa and thousands of other masterpieces."
                    },
                    {
                        name: "Café de Flore",
                        time: "1:30 PM - 3:00 PM",
                        description: "Historic café in the Saint-Germain-des-Prés area of Paris. Famous for its notable clientele of intellectuals and artists."
                    },
                    {
                        name: "Musée d'Orsay",
                        time: "3:30 PM - 6:30 PM",
                        description: "Museum housed in the former Gare d'Orsay railway station. It holds mainly French art dating from 1848 to 1914."
                    }
                ],
                transportation: [
                    { type: "Walk", duration: "15 minutes", distance: "1.2 km" },
                    { type: "Metro", duration: "20 minutes", distance: "Line 4" }
                ]
            },
            {
                title: "Day 2: Iconic Paris",
                sites: [
                    {
                        name: "Eiffel Tower",
                        time: "10:00 AM - 12:00 PM",
                        description: "Iconic wrought-iron lattice tower on the Champ de Mars. Named after engineer Gustave Eiffel."
                    },
                    {
                        name: "Les Papilles",
                        time: "12:30 PM - 2:00 PM",
                        description: "Renowned bistro offering traditional French cuisine with a modern twist. Known for its excellent wine selection."
                    },
                    {
                        name: "Seine River Cruise",
                        time: "3:00 PM - 5:00 PM",
                        description: "Scenic boat tour along the Seine River, offering views of many Parisian landmarks."
                    }
                ],
                transportation: [
                    { type: "Walk", duration: "25 minutes", distance: "2.0 km" },
                    { type: "Bus", duration: "15 minutes", distance: "Route 72" }
                ]
            },
            {
                title: "Day 3: Hidden Gems",
                sites: [
                    {
                        name: "Montmartre",
                        time: "9:00 AM - 11:30 AM",
                        description: "Historic arts district with the stunning Sacré-Cœur Basilica and charming streets."
                    },
                    {
                        name: "Le Marais District",
                        time: "1:00 PM - 4:00 PM",
                        description: "Trendy neighborhood with medieval architecture, boutiques, and galleries."
                    },
                    {
                        name: "Bistrot Paul Bert",
                        time: "7:00 PM - 9:30 PM",
                        description: "Classic French bistro known for its steak frites and traditional desserts."
                    }
                ],
                transportation: [
                    { type: "Metro", duration: "25 minutes", distance: "Line 2" },
                    { type: "Taxi", duration: "15 minutes", distance: "3.5 km" }
                ]
            }
        ]
    },
    
    // Nearby points data for map
    nearbyPoints: {
        'r4': [
            { 
                title: "Shakespeare and Company", 
                content: "Famous independent bookstore, just a short walk from Notre-Dame.", 
                type: "culture"
            },
            { 
                title: "Berthillon", 
                content: "Renowned ice cream shop on Île Saint-Louis.", 
                type: "food"
            },
            { 
                title: "Rue Montorgueil", 
                content: "Vibrant pedestrian street with many restaurants and food shops.", 
                type: "shopping"
            }
        ]
    },
    
    // Transportation validation data
    transportValidation: {
        'r4': {
            status: "valid",
            message: "All transportation options are available for your dates.",
            details: [
                { 
                    type: "Metro", 
                    status: "operational", 
                    note: "Lines 1, 4, and 12 run every 4-8 minutes during your visit."
                },
                { 
                    type: "Bus", 
                    status: "operational", 
                    note: "Routes 24, 42, and 72 serve all your planned locations."
                },
                { 
                    type: "Taxi", 
                    status: "available", 
                    note: "Readily available throughout the city, average wait time 5-10 minutes."
                }
            ]
        }
    },
    
    // Interest points validation data
    interestValidation: {
        'r4': {
            status: "valid",
            message: "All interest points are open during your planned visit.",
            details: [
                { 
                    site: "Louvre Museum", 
                    status: "open", 
                    hours: "9:00 AM - 6:00 PM",
                    note: "Closed on Tuesdays. Advance booking recommended."
                },
                { 
                    site: "Musée d'Orsay", 
                    status: "open", 
                    hours: "9:30 AM - 6:00 PM",
                    note: "Closed on Mondays. Extended hours on Thursdays."
                },
                { 
                    site: "Eiffel Tower", 
                    status: "open", 
                    hours: "9:00 AM - 11:45 PM",
                    note: "Last elevator at 10:30 PM. Advance booking strongly recommended."
                }
            ]
        }
    },
    
    // Statistics for routes
    routeStats: {
        'r4': {
            total_distance: "15.6 km",
            walking_time: "3.5 hours",
            public_transport_time: "1.2 hours",
            sites_visited: 7,
            estimated_cost: {
                attractions: "$120",
                food: "$180",
                transport: "$30",
                total: "$330"
            },
            popular_ratings: {
                ease_of_navigation: 4.5,
                value_for_money: 4.2,
                cultural_experience: 4.8,
                overall: 4.5
            }
        }
    }
};

// Helper functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomId() {
    return 'r' + Math.floor(Math.random() * 9000 + 1000);
}

/**
 * Make an actual call to the OpenAI API
 * This function would connect to a secure backend in a production environment
 */
async function callOpenAIAPI(endpoint, prompt, options = {}) {
    if (!config.useRealOpenAI) {
        throw new Error('Real OpenAI API is disabled. Enable it in the configuration.');
    }
    
    if (!config.apiKey) {
        throw new Error('OpenAI API key is not configured.');
    }
    
    debugLog(`Calling OpenAI API (${config.model})`, { endpoint, promptLength: prompt.length });
    
    try {
        // In a production environment, this would be a secure backend call
        // that manages API keys and handles rate limiting
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are a travel planning assistant that creates detailed travel itineraries. Respond in JSON format.'
                    },
                    { 
                        role: 'user', 
                        content: prompt 
                    }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            // Parse the JSON response
            return JSON.parse(content);
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            console.log('Raw response:', content);
            throw new Error('Failed to parse OpenAI response as JSON');
        }
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

/**
 * Simulates a call to the OpenAI API
 * In a real implementation, this would be an actual fetch call to a backend endpoint
 * that securely manages the OpenAI API key and handles the request
 */
async function simulateOpenAICall(endpoint, prompt, options = {}) {
    debugLog(`Simulating OpenAI API call to endpoint: ${endpoint}`, { promptLength: prompt.length });
    
    const randomDelay = 800 + Math.random() * 1200; // Random delay between 800-2000ms
    await delay(randomDelay);
    
    debugLog('User query for simulation:', options.query || 'No query provided');
    
    // In a real implementation, this would be:
    /*
    const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            endpoint,
            prompt,
            options
        })
    });
    
    if (!response.ok) {
        throw new Error('API request failed');
    }
    
    return await response.json();
    */
    
    // For demo purposes, we'll use our improved mock generation logic
    try {
        switch (endpoint) {
            case 'generateRoute':
                return generateMockRoute(prompt, options);
            case 'generateMapData':
                return generateMockMapData(options.routeId);
            case 'generateTimelineData':
                return generateMockTimelineData(options.routeId, options.days);
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
    } catch (error) {
        debugLog('Error in simulation:', error);
        throw error;
    }
}

// Create namespaces for each API category
TourGuideAPI.Chat = {};
TourGuideAPI.Map = {};
TourGuideAPI.Profile = {};

// Chat Page API functions
TourGuideAPI.Chat.user_route_generate = async function(query) {
    try {
        debugLog('Route generation request:', query);
        
        // Create a prompt that would work well with the OpenAI API
        const prompt = `Create a detailed travel route based on the following user query: "${query}".
                        Please analyze the query to determine:
                        1. The destination location
                        2. The number of days for the trip
                        3. The traveler's interests and preferences
                        
                        Return a JSON object with the following structure:
                        {
                          "id": "unique_id",
                          "name": "descriptive_route_name",
                          "location": "destination_city_and_country",
                          "days": number_of_days,
                          "sites": estimated_number_of_sites,
                          "cost": estimated_cost_in_usd,
                          "upvotes": 0,
                          "views": 0,
                          "created_date": "current_date_iso_string",
                          "user": {
                            "id": "user_id",
                            "name": "user_name",
                            "avatar": "avatar_url"
                          },
                          "interests": "comma_separated_interests",
                          "query": "original_query"
                        }`;
        
        let result;
        
        // Determine whether to use real API or simulation
        if (config.useRealOpenAI) {
            debugLog('Using real OpenAI API');
            result = await callOpenAIAPI('generateRoute', prompt, { query });
            
            // Ensure the result has all required fields
            result.id = result.id || randomId();
            result.created_date = result.created_date || new Date().toISOString();
            result.upvotes = result.upvotes || 0;
            result.views = result.views || 0;
            
            // Add default user if not provided
            if (!result.user) {
                result.user = {
                    id: 'u4',
                    name: 'John Traveler',
                    avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
                };
            }
        } else {
            debugLog('Using simulated OpenAI API');
            // Call our simulated OpenAI API
            result = await simulateOpenAICall('generateRoute', prompt, { query });
        }
        
        debugLog('Route generation result:', result);
        
        // Add to mock data for other functions to use
        mockData.routes.push(result);
        
        // Also create some basic map data for the new route
        mockData.mapData[result.id] = {
            route: {
                id: result.id,
                location: result.location,
                days: result.days,
                interests: result.interests
            },
            markers: []
        };
        
        // Add route timeline data
        const timelinePrompt = `Create a day-by-day timeline for a ${result.days}-day trip to ${result.location} 
                               with these interests: ${result.interests}.
                               Include activities, sites, restaurants, and transportation for each day.`;
        
        mockData.timelines[result.id] = config.useRealOpenAI 
            ? await callOpenAIAPI('generateTimelineData', timelinePrompt, { 
                routeId: result.id, 
                days: result.days,
                location: result.location,
                interests: result.interests
            })
            : await simulateOpenAICall('generateTimelineData', timelinePrompt, { 
                routeId: result.id, 
                days: result.days 
            });
        
        return result;
    } catch (error) {
        console.error('Error in user_route_generate:', error);
        throw error;
    }
};

TourGuideAPI.Chat.user_route_generate_randomly = async function() {
    try {
        debugLog('Random route generation request');
        
        // In a real implementation with the OpenAI API, we would have a more creative prompt
        const prompt = `Generate a random travel destination and itinerary for a traveler seeking a surprise vacation.
                        Be creative and specific. Choose an interesting location, duration, and suggested activities
                        based on the character of the place. Return as a detailed JSON object.`;
        
        // For simulation, we'll use improved random generation
        const destinations = [
            "Tokyo, Japan",
            "Paris, France",
            "Rome, Italy",
            "Barcelona, Spain",
            "London, UK",
            "New York, USA",
            "Sydney, Australia",
            "Cairo, Egypt",
            "Bangkok, Thailand",
            "Rio de Janeiro, Brazil",
            "Kyoto, Japan",
            "Amsterdam, Netherlands",
            "Istanbul, Turkey",
            "Marrakech, Morocco",
            "Prague, Czech Republic"
        ];
        
        // We've expanded our interest options and made them more descriptive
        const interestOptions = [
            "art museums and galleries",
            "local cuisine and food tours",
            "historical sites and architecture",
            "beautiful beaches and coastal views",
            "shopping and local markets",
            "outdoor activities and nature",
            "nightlife and entertainment",
            "cultural performances and festivals",
            "local crafts and artisans",
            "religious and spiritual sites"
        ];
        
        // Generate random parameters with more variety
        const location = destinations[Math.floor(Math.random() * destinations.length)];
        const days = Math.floor(Math.random() * 6) + 2; // 2-7 days
        
        // Random interests (1-3)
        const numInterests = Math.floor(Math.random() * 2) + 2; // 2-3 interests
        const shuffledInterests = [...interestOptions].sort(() => 0.5 - Math.random());
        const selectedInterests = shuffledInterests.slice(0, numInterests);
        
        // Create a more natural-sounding query
        const durationText = days === 1 ? 'a day trip' : 
                            days === 2 ? 'a weekend' : 
                            days === 7 ? 'a week' : 
                            `${days} days`;
        
        let query = `I'm planning ${durationText} in ${location.split(',')[0]} and I'm interested in exploring `;
        
        selectedInterests.forEach((interest, index) => {
            if (index === selectedInterests.length - 1 && selectedInterests.length > 1) {
                query += `and ${interest}`;
            } else if (index === 0) {
                query += interest;
            } else {
                query += `, ${interest}`;
            }
        });
        query += `. What would you recommend?`;
        
        debugLog('Generated random query:', query);
        
        // Call the same function used for user queries
        return this.user_route_generate(query);
    } catch (error) {
        console.error('Error in user_route_generate_randomly:', error);
        throw error;
    }
};

// Map Page API functions
TourGuideAPI.Map.map_real_time_display = async function(routeId) {
    try {
        // In a real implementation, this would call a mapping service API through a backend service
        const prompt = `Generate map data for route ${routeId} including markers for all points of interest.`;
        
        // Simulate network delay
        await delay(800);
        
        // Return map data for the route or a default if not found
        return mockData.mapData[routeId] || { route: { location: "Unknown" }, markers: [] };
    } catch (error) {
        console.error('Error in map_real_time_display:', error);
        throw error;
    }
};

TourGuideAPI.Map.get_nearby_interest_point = async function(routeId) {
    try {
        // In a real implementation, this would call a points of interest API through a backend service
        const prompt = `Find nearby points of interest for route ${routeId}.`;
        
        // Simulate network delay
        await delay(600);
        
        // Return nearby points data for the route or a default if not found
        return mockData.nearbyPoints[routeId] || [];
    } catch (error) {
        console.error('Error in get_nearby_interest_point:', error);
        throw error;
    }
};

TourGuideAPI.Map.user_route_split_by_day = async function(routeId) {
    try {
        // In a real implementation, this would call the OpenAI API to generate a timeline
        const prompt = `Generate a day-by-day timeline for route ${routeId}.`;
        
        // Simulate network delay
        await delay(700);
        
        // Return timeline data for the route or a default if not found
        return mockData.timelines[routeId] || [];
    } catch (error) {
        console.error('Error in user_route_split_by_day:', error);
        throw error;
    }
};

TourGuideAPI.Map.user_route_transportation_validation = async function(routeId) {
    try {
        // In a real implementation, this would call a transportation API to validate options
        const prompt = `Validate transportation options for route ${routeId}.`;
        
        // Simulate network delay
        await delay(500);
        
        // Return transportation validation data for the route or a default if not found
        return mockData.transportValidation[routeId] || {
            status: "unknown",
            message: "Unable to validate transportation options.",
            details: []
        };
    } catch (error) {
        console.error('Error in user_route_transportation_validation:', error);
        throw error;
    }
};

TourGuideAPI.Map.user_route_interest_points_validation = async function(routeId) {
    try {
        // In a real implementation, this would call an API to validate opening hours, etc.
        const prompt = `Validate interest points for route ${routeId}.`;
        
        // Simulate network delay
        await delay(500);
        
        // Return interest points validation data for the route or a default if not found
        return mockData.interestValidation[routeId] || {
            status: "unknown",
            message: "Unable to validate interest points.",
            details: []
        };
    } catch (error) {
        console.error('Error in user_route_interest_points_validation:', error);
        throw error;
    }
};

// Profile Page API functions
TourGuideAPI.Profile.route_statics = async function(routeId) {
    try {
        // In a real implementation, this would call an analytics API
        const prompt = `Generate statistics for route ${routeId}.`;
        
        // Simulate network delay
        await delay(600);
        
        // Return stats data for the route or a default if not found
        return mockData.routeStats[routeId] || {
            total_distance: "0 km",
            walking_time: "0 hours",
            public_transport_time: "0 hours",
            sites_visited: 0,
            estimated_cost: {
                attractions: "$0",
                food: "$0",
                transport: "$0",
                total: "$0"
            },
            popular_ratings: {
                ease_of_navigation: 0,
                value_for_money: 0,
                cultural_experience: 0,
                overall: 0
            }
        };
    } catch (error) {
        console.error('Error in route_statics:', error);
        throw error;
    }
};

TourGuideAPI.Profile.rank_route = async function(sortBy = 'upvotes', sortOrder = 'desc') {
    try {
        // In a real implementation, this would call a backend service to get and sort routes
        const prompt = `Get routes sorted by ${sortBy} in ${sortOrder} order.`;
        
        // Simulate network delay
        await delay(800);
        
        // Sort the routes based on the given criteria
        const routes = [...mockData.routes];
        
        routes.sort((a, b) => {
            let comparison = 0;
            
            // Handle different sort criteria
            if (sortBy === 'created_date') {
                comparison = new Date(a.created_date) - new Date(b.created_date);
            } else {
                comparison = a[sortBy] - b[sortBy];
            }
            
            // Adjust for sort order
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        return routes;
    } catch (error) {
        console.error('Error in rank_route:', error);
        throw error;
    }
};

// Mock generation functions are enhanced for better randomization and variety
function generateMockRoute(prompt, options) {
    debugLog('Generating mock route from prompt', { promptExcerpt: prompt.substring(0, 50) + '...' });
    
    const query = options.query;
    const routeId = randomId();
    
    // Parse the query (this would be handled by the AI in a real implementation)
    // This version has improved parsing logic to better handle different inputs
    let location = "Paris, France";  // Default
    
    // More sophisticated location detection
    const locationPatterns = [
        { pattern: /tokyo|japan/i, location: "Tokyo, Japan" },
        { pattern: /rome|italy/i, location: "Rome, Italy" },
        { pattern: /barcelona|spain/i, location: "Barcelona, Spain" },
        { pattern: /london|uk|england/i, location: "London, UK" },
        { pattern: /new york|nyc|america|usa/i, location: "New York, USA" },
        { pattern: /sydney|australia/i, location: "Sydney, Australia" },
        { pattern: /paris|france/i, location: "Paris, France" },
        { pattern: /bangkok|thailand/i, location: "Bangkok, Thailand" },
        { pattern: /kyoto/i, location: "Kyoto, Japan" },
        { pattern: /amsterdam|netherlands/i, location: "Amsterdam, Netherlands" }
    ];
    
    for (const { pattern, location: loc } of locationPatterns) {
        if (pattern.test(query.toLowerCase())) {
            location = loc;
            break;
        }
    }
    
    // Parse days with improved detection
    let days = 3;  // Default
    
    if (query.toLowerCase().includes("week") || query.toLowerCase().includes("7 day")) {
        days = 7;
    } else if (query.toLowerCase().includes("weekend") || query.toLowerCase().includes("2 day")) {
        days = 2;
    } else {
        // Try to find a number followed by "day" or "days"
        const daysMatch = query.match(/(\d+)\s*(day|days)/i);
        if (daysMatch) {
            days = parseInt(daysMatch[1], 10);
            // Sanity check
            if (days < 1) days = 1;
            if (days > 14) days = 14;
        }
    }
    
    // Parse interests with much better detection
    const interestPatterns = [
        { pattern: /museum|gallery|exhibition|art/i, interest: "art museums" },
        { pattern: /food|eat|cuisine|restaurant|dining|gastronomy/i, interest: "local cuisine" },
        { pattern: /history|historical|ancient|heritage/i, interest: "history" },
        { pattern: /beach|sea|ocean|coast|swim/i, interest: "beaches" },
        { pattern: /shop|market|store|buy|mall/i, interest: "shopping" },
        { pattern: /nature|hike|outdoor|mountain|park|garden/i, interest: "nature" },
        { pattern: /nightlife|bar|club|party|evening/i, interest: "nightlife" },
        { pattern: /culture|tradition|local|authentic/i, interest: "culture" },
        { pattern: /architecture|building|design|structure/i, interest: "architecture" },
        { pattern: /relax|spa|wellness|peaceful/i, interest: "relaxation" }
    ];
    
    let interests = [];
    
    for (const { pattern, interest } of interestPatterns) {
        if (pattern.test(query.toLowerCase())) {
            interests.push(interest);
        }
    }
    
    // Always ensure at least one interest
    if (interests.length === 0) {
        // Pick random interests based on the location
        const locationBasedInterests = {
            "Tokyo": ["shopping", "culture", "food"],
            "Rome": ["history", "architecture", "cuisine"],
            "Barcelona": ["architecture", "beaches", "nightlife"],
            "London": ["history", "shopping", "culture"],
            "New York": ["art museums", "shopping", "food"],
            "Paris": ["art museums", "cuisine", "architecture"]
        };
        
        const cityName = location.split(',')[0];
        if (locationBasedInterests[cityName]) {
            interests = interests.concat(locationBasedInterests[cityName]);
        } else {
            // Fallback to random interests
            const defaultInterests = ["culture", "local cuisine", "architecture"];
            interests = interests.concat(defaultInterests);
        }
    }
    
    // Generate route name with more variety
    const namePatterns = [
        `${days}-Day ${location.split(',')[0]} Adventure`,
        `${location.split(',')[0]} Explorer: ${days} Day Journey`,
        `Discovering ${location.split(',')[0]} in ${days} Days`,
        `${location.split(',')[0]} Experience: ${interests[0]} & More`,
        `The Ultimate ${days}-Day ${location.split(',')[0]} Itinerary`
    ];
    
    const routeName = namePatterns[Math.floor(Math.random() * namePatterns.length)];
    
    // Calculate costs with more realistic logic
    const baseCostPerDay = {
        "Tokyo": 400,
        "Kyoto": 350,
        "Paris": 350,
        "London": 380,
        "Rome": 320,
        "Barcelona": 320,
        "New York": 400,
        "Sydney": 370,
        "Bangkok": 200,
        "Amsterdam": 330
    };
    
    const cityName = location.split(',')[0];
    const dailyCost = baseCostPerDay[cityName] || 300;
    
    // Add some cost variation
    const variationFactor = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15
    const cost = Math.round(dailyCost * days * variationFactor);
    
    // Add timestamp variation
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 12));
    
    debugLog('Generated route details', { location, days, interests });
    
    // Create the route object (in a real implementation, this structure would be generated by the AI)
    return {
        id: routeId,
        name: routeName,
        location: location,
        days: days,
        sites: Math.floor(days * (2 + Math.random())), // 2-3 sites per day
        cost: cost,
        upvotes: 0,
        views: 0,
        created_date: timestamp.toISOString(),
        user: {
            id: 'u4',
            name: 'John Traveler',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        interests: interests.join(", "),
        query: query
    };
}

function generateMockMapData(routeId) {
    // This would be generated by a mapping service API in a real implementation
    return mockData.mapData[routeId] || { route: { location: "Unknown" }, markers: [] };
}

function generateMockTimelineData(routeId, days) {
    // In a real implementation, this would be generated by the OpenAI API based on the route details
    const timeline = [];
    const route = mockData.routes.find(r => r.id === routeId) || { location: "Unknown" };
    const location = route.location;
    
    for (let i = 1; i <= days; i++) {
        const dayTitle = `Day ${i}: ${i === 1 ? "Arrival & Orientation" : 
                                    i === days ? "Final Explorations" : 
                                    `Exploring ${location.split(',')[0]}`}`;
        
        const daySites = [
            {
                name: `${location.split(',')[0]} Point of Interest ${i}-1`,
                time: "9:00 AM - 11:30 AM",
                description: `A popular attraction in ${location.split(',')[0]}.`
            },
            {
                name: `${location.split(',')[0]} Lunch Spot`,
                time: "12:00 PM - 1:30 PM",
                description: `A place to enjoy local cuisine in ${location.split(',')[0]}.`
            },
            {
                name: `${location.split(',')[0]} Point of Interest ${i}-2`,
                time: "2:00 PM - 5:00 PM",
                description: `Another interesting location in ${location.split(',')[0]}.`
            }
        ];
        
        const dayTransportation = [
            { type: "Walk", duration: "15 minutes", distance: "1.2 km" },
            { type: "Metro", duration: "20 minutes", distance: `Line ${Math.floor(Math.random() * 5) + 1}` }
        ];
        
        timeline.push({
            title: dayTitle,
            sites: daySites,
            transportation: dayTransportation
        });
    }
    
    return timeline;
}

debugLog("TourGuideAPI loaded successfully", {
    mode: config.useRealOpenAI ? "REAL OPENAI API" : "SIMULATION MODE",
    model: config.model
});

// Export the OpenAI configuration functions for test console access
TourGuideAPI.Config = {
    setUseRealOpenAI: function(value) {
        config.useRealOpenAI = !!value;
        debugLog(`OpenAI API mode changed to: ${config.useRealOpenAI ? "REAL API" : "SIMULATION"}`);
        return `OpenAI API mode is now: ${config.useRealOpenAI ? "REAL API" : "SIMULATION"}`;
    },
    setApiKey: function(key) {
        if (!key || typeof key !== 'string' || key.length < 10) {
            throw new Error('Invalid API key format');
        }
        config.apiKey = key;
        debugLog('API key has been set');
        return 'API key has been set successfully';
    },
    getStatus: function() {
        return {
            mode: config.useRealOpenAI ? "REAL OPENAI API" : "SIMULATION MODE",
            keyConfigured: !!config.apiKey,
            model: config.model,
            debug: config.debug
        };
    },
    setDebug: function(value) {
        config.debug = !!value;
        return `Debug mode is now: ${config.debug ? "ON" : "OFF"}`;
    }
}; 