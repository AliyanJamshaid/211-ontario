import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

interface Service {
  id: string;
  name: string;
  subtitle?: string;
  location?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  url?: string;
}

async function fetchAndParse(url: string): Promise<Service[]> {
  console.log(`Fetching: ${url}`);

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  });

  const html = response.data;
  const $ = cheerio.load(html);
  const services: Service[] = [];

  // Find all service records in the page
  $('.dataportal-record').each((_, element) => {
    const $el = $(element);

    const id = $el.attr('data-id') || '';
    const name = $el.find('.record-agency, .record-name').first().text().trim();
    const subtitle = $el.find('.record-title, .subtitle').first().text().trim();
    const address = $el.find('.record-address, .address').first().text().trim();
    const url = $el.find('.record-agency').attr('href') || '';

    // Extract lat/lng from the element if available
    const latStr = $el.attr('data-lat');
    const lngStr = $el.attr('data-lng');

    if (name || id) {
      services.push({
        id,
        name,
        subtitle,
        address,
        url: url ? `https://211ontario.ca${url}` : undefined,
        latitude: latStr ? parseFloat(latStr) : undefined,
        longitude: lngStr ? parseFloat(lngStr) : undefined,
      });
    }
  });

  // Also parse from embedded JavaScript (Google Maps markers)
  const scriptContent = html;
  const markerRegex = /var contentString(\d+) = '<div class="google-info">.*?<a href="([^"]+)"[^>]*class="record-agency link">([^<]+)<\/a>.*?<div class="subtitle">([^<]*)<\/div>.*?<div class="subsubtitle">([^<]*)<\/div>.*?<div class="record-detail-content">([^<]+)<br \/>([^<]+)<\/div>/g;

  let match;
  while ((match = markerRegex.exec(scriptContent)) !== null) {
    const [, id, url, name, subtitle, location, address, cityPostal] = match;

    // Extract lat/lng from position variable
    const posRegex = new RegExp(`var pos = \\{lat: ([\\d\\.\\-]+), lng: ([\\d\\.\\-]+)\\};[\\s\\S]{0,500}marker${id}`, 'g');
    const posMatch = posRegex.exec(scriptContent);

    services.push({
      id,
      name: name.replace(/\\'/g, "'"),
      subtitle: subtitle.replace(/\\'/g, "'"),
      location: location.replace(/\\'/g, "'"),
      address: address.replace(/\\'/g, "'").trim(),
      city: cityPostal.replace(/\\'/g, "'").trim(),
      latitude: posMatch ? parseFloat(posMatch[1]) : undefined,
      longitude: posMatch ? parseFloat(posMatch[2]) : undefined,
      url: url.startsWith('http') ? url : `https://211ontario.ca${url}`,
    });
  }

  return services;
}

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

async function main() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('🚀 Starting 211 Ontario HTML parser...\n');

  for (const [locationKey, location] of Object.entries(LOCATIONS)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Scraping ${location.name}`);
    console.log(`   Coordinates: ${location.latitude}, ${location.longitude}`);
    console.log(`${'='.repeat(60)}\n`);

    // Fetch all services without topic filter to get everything
    const url = `https://211ontario.ca/results/?latitude=${location.latitude}&longitude=${location.longitude}&searchLocation=${encodeURIComponent(location.name)}&searchTerms=&exct=0&sd=100&ss=Distance`;

    const services = await fetchAndParse(url);

    const result = {
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      scrapedAt: new Date().toISOString(),
      totalServices: services.length,
      services,
    };

    const filename = `${locationKey}_all_services.json`;
    const filepath = path.join(dataDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));

    console.log(`\n💾 Saved ${services.length} services to data/${filename}`);

    // Delay between locations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✨ Scraping completed!');
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
