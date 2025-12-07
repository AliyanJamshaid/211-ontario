import { Ontario211Scraper } from '../lib/scraper';
import fs from 'fs';
import path from 'path';

// Location coordinates
const LOCATIONS = {
  halton: {
    name: 'Halton, ON',
    latitude: 43.5204,
    longitude: -79.8608,
  },
  mississauga: {
    name: 'Mississauga, ON',
    latitude: 43.5890,
    longitude: -79.6441,
  },
};

async function scrapeAllLocations() {
  const scraper = new Ontario211Scraper();

  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('🚀 Starting 211 Ontario scraper...\n');

  // First, fetch all topics
  console.log('📋 Fetching available topics...');
  const topics = await scraper.fetchTopics();
  console.log(`✅ Found ${topics.length} topics\n`);

  // Save topics to JSON
  fs.writeFileSync(
    path.join(dataDir, 'topics.json'),
    JSON.stringify(topics, null, 2)
  );
  console.log('💾 Topics saved to data/topics.json\n');

  // Scrape each location
  for (const [locationKey, location] of Object.entries(LOCATIONS)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Scraping ${location.name}`);
    console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
    console.log(`${'='.repeat(60)}\n`);

    const allServices: any = {
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      scrapedAt: new Date().toISOString(),
      topics: {},
      allServices: [],
    };

    // Fetch services for each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`[${i + 1}/${topics.length}] Fetching: ${topic.name}...`);

      try {
        const services = await scraper.fetchServices({
          latitude: location.latitude,
          longitude: location.longitude,
          searchLocation: location.name,
          topicPath: topic.id,
          searchDistance: 100, // 100km to get more results
        });

        allServices.topics[topic.name] = services;

        // Add to all services (avoid duplicates)
        services.forEach(service => {
          if (!allServices.allServices.find((s: any) => s.id === service.id)) {
            allServices.allServices.push(service);
          }
        });

        console.log(`   ✅ Found ${services.length} services`);

        // Delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   ❌ Error fetching ${topic.name}:`, error);
        allServices.topics[topic.name] = [];
      }
    }

    // Also fetch general services without topic filter
    console.log(`\nFetching general services without topic filter...`);
    try {
      const generalServices = await scraper.fetchServices({
        latitude: location.latitude,
        longitude: location.longitude,
        searchLocation: location.name,
        searchDistance: 100,
      });

      allServices.general = generalServices;

      // Add to all services
      generalServices.forEach(service => {
        if (!allServices.allServices.find((s: any) => s.id === service.id)) {
          allServices.allServices.push(service);
        }
      });

      console.log(`   ✅ Found ${generalServices.length} general services`);
    } catch (error) {
      console.error(`   ❌ Error fetching general services:`, error);
    }

    // Save to JSON file
    const filename = `${locationKey}_services.json`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(allServices, null, 2));

    console.log(`\n💾 Saved ${allServices.allServices.length} unique services to data/${filename}`);
    console.log(`   Topics scraped: ${Object.keys(allServices.topics).length}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ Scraping completed!');
  console.log(`📁 Data saved in: ${dataDir}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run the scraper
scrapeAllLocations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
