import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface Service {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  serviceDetails?: string;
}

interface TopicData {
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  services: Service[];
}

const LOCATIONS = {
  halton: {
    name: 'Halton',
    latitude: 43.532537,
    longitude: -79.874484,
  },
  mississauga: {
    name: 'Mississauga',
    latitude: 43.589,
    longitude: -79.6441,
  },
};

async function fetchServicesForSubtopic(
  location: { name: string; latitude: number; longitude: number },
  subtopicId: string,
  retries = 3
): Promise<Service[]> {
  const url = `https://211ontario.ca/results/?latitude=${location.latitude}&longitude=${location.longitude}&searchLocation=${encodeURIComponent(location.name)}&searchTerms=&exct=0&sd=100&ss=Distance&topicPath=${subtopicId}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'Referer': 'https://211ontario.ca/search/'
        },
        timeout: 30000 // 30 second timeout
      });

      const html = response.data;
      return parseServices(html);

    } catch (error) {
      if (attempt < retries) {
        const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s, 6s
        console.log(`   ⚠️  Retry ${attempt}/${retries} after ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`   ❌ Error fetching subtopic ${subtopicId} after ${retries} attempts:`, error instanceof Error ? error.message : error);
        return [];
      }
    }
  }

  return [];
}

function parseServices(html: string): Service[] {
  const $ = cheerio.load(html);
  const services: Service[] = [];

  // Parse from the record-list-row elements
  $('.record-list-row').each((_, element) => {
    const $el = $(element);
    const id = $el.attr('data-id') || '';

    // Get the main record info
    const $record = $el.find('.record');

    // Extract name and URL
    const $titleLink = $record.find('.title a.record-agency');
    const name = $titleLink.text().trim();
    const website = $titleLink.attr('href') || '';

    // Extract subtitle and location
    const subtitle = $record.find('.subtitle').text().trim();
    const location = $record.find('.subsubtitle').text().trim();

    // Extract phone numbers
    const phones: string[] = [];
    $record.find('.linkphone_fa6 a').each((_, phoneEl) => {
      phones.push($(phoneEl).text().trim());
    });

    // Extract website link
    const $websiteLink = $record.find('a.linkexternal_fa6');
    const externalWebsite = $websiteLink.attr('href') || '';

    // Extract detailed description from the hidden details section
    const $details = $el.find(`.record-list-details#${id}`);
    const $description = $details.find('.record-list-desc');
    const description = $description.html()?.trim() || undefined;

    // Try to extract lat/lng from Google Maps script (if available)
    const markerRegex = new RegExp(`var pos = \\{lat: ([\\d\\.\\-]+), lng: ([\\d\\.\\-]+)\\};[\\s\\S]{0,500}marker${id}`, 'g');
    const posMatch = markerRegex.exec(html);

    if (name) {
      services.push({
        id,
        name,
        subtitle: subtitle || undefined,
        description,
        address: location || undefined,
        phone: phones.length > 0 ? phones.join('; ') : undefined,
        website: externalWebsite || website || undefined,
        latitude: posMatch ? parseFloat(posMatch[1]) : undefined,
        longitude: posMatch ? parseFloat(posMatch[2]) : undefined,
      });
    }
  });

  return services;
}

async function scrapeAllServices() {
  console.log('🚀 Starting comprehensive 211 Ontario scraper...\n');

  // Load topics data
  const topicsPath = path.join(process.cwd(), 'data', 'all-topics-with-subtopics.json');
  if (!fs.existsSync(topicsPath)) {
    console.error('❌ Topics file not found! Run "npm run topics" first.');
    process.exit(1);
  }

  const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));

  // Flatten all subtopics
  const allSubtopics: Array<{ topicId: string; topicName: string; subtopicId: string; subtopicName: string }> = [];
  topics.forEach((topic: any) => {
    topic.subtopics.forEach((subtopic: any) => {
      allSubtopics.push({
        topicId: topic.id,
        topicName: topic.name,
        subtopicId: subtopic.id,
        subtopicName: subtopic.heading
      });
    });
  });

  console.log(`📊 Total subtopics to scrape: ${allSubtopics.length}`);
  console.log(`📍 Locations: ${Object.keys(LOCATIONS).length}\n`);

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Scrape each location
  for (const [locationKey, location] of Object.entries(LOCATIONS)) {
    console.log('\n' + '='.repeat(60));
    console.log(`📍 Scraping ${location.name.toUpperCase()}`);
    console.log('='.repeat(60) + '\n');

    const locationData: TopicData[] = [];
    let totalServices = 0;

    // Process in batches of 3 parallel requests (conservative to avoid rate limits)
    const BATCH_SIZE = 3;
    const BATCH_DELAY = 2000; // 2 seconds between batches

    for (let i = 0; i < allSubtopics.length; i += BATCH_SIZE) {
      const batch = allSubtopics.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allSubtopics.length / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} subtopics)`);
      console.log('-'.repeat(60));

      // Fetch all subtopics in this batch in parallel
      const batchPromises = batch.map(async (subtopic, idx) => {
        const globalIdx = i + idx;
        const progress = `[${globalIdx + 1}/${allSubtopics.length}]`;

        console.log(`${progress} Fetching: ${subtopic.topicName} → ${subtopic.subtopicName}`);

        const services = await fetchServicesForSubtopic(location, subtopic.subtopicId);

        console.log(`${progress} ✅ Found ${services.length} services`);

        return {
          topicId: subtopic.topicId,
          topicName: subtopic.topicName,
          subtopicId: subtopic.subtopicId,
          subtopicName: subtopic.subtopicName,
          services
        };
      });

      // Wait for all requests in this batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Add results to locationData
      locationData.push(...batchResults);

      // Count total services
      batchResults.forEach(result => {
        totalServices += result.services.length;
      });

      // Delay between batches to avoid overwhelming the server
      if (i + BATCH_SIZE < allSubtopics.length) {
        console.log(`\n⏳ Waiting ${BATCH_DELAY/1000}s before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Save to JSON
    const result = {
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      scrapedAt: new Date().toISOString(),
      totalSubtopics: allSubtopics.length,
      totalServices,
      data: locationData
    };

    const filename = `${locationKey}_complete_services.json`;
    const filepath = path.join(dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${location.name} completed!`);
    console.log(`💾 Saved to: data/${filename}`);
    console.log(`📊 Total services scraped: ${totalServices}`);
    console.log('='.repeat(60));
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('🎉 ALL SCRAPING COMPLETED!');
  console.log('='.repeat(60) + '\n');
}

scrapeAllServices().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
