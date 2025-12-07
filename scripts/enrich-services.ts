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
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  subtopicIds: string[];
  locations: string[];
}

interface ServiceDetails {
  fullDescription?: string;
  eligibility?: string;
  applicationProcess?: string;
  documentsRequired?: string;
  mailingAddress?: string;
  languages?: string;
  fees?: string;
  accessibility?: string;
  hoursOfOperation?: string;
  serviceAreas?: string;
  googleMapsLink?: string;
  lastUpdated?: string;
  detailsHTML?: string; // Raw HTML of the entire details section
}

interface EnrichedService extends Service {
  details?: ServiceDetails;
}

async function fetchServiceDetails(serviceId: string, retries = 3): Promise<ServiceDetails | null> {
  const url = `https://211ontario.ca/service/${serviceId}/`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'Referer': 'https://211ontario.ca/search/'
        },
        timeout: 30000
      });

      const html = response.data;
      return parseServiceDetails(html);

    } catch (error) {
      if (attempt < retries) {
        const waitTime = attempt * 2000;
        console.log(`   ⚠️  Retry ${attempt}/${retries} after ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`   ❌ Error fetching service ${serviceId} after ${retries} attempts:`, error instanceof Error ? error.message : error);
        return null;
      }
    }
  }

  return null;
}

function parseServiceDetails(html: string): ServiceDetails {
  const $ = cheerio.load(html);
  const details: ServiceDetails = {};

  // Store raw HTML of the entire dataportal-container
  const containerHTML = $('.dataportal-container').html();
  if (containerHTML) {
    details.detailsHTML = containerHTML.trim();
  }

  // Parse all detail fields
  $('dl dt.record-detail-label').each((_, element) => {
    const label = $(element).text().trim();
    const content = $(element).next('dd.record-detail-content');

    switch (label) {
      case 'Description':
        details.fullDescription = content.html()?.trim();
        break;
      case 'Eligibility':
        details.eligibility = content.text().trim();
        break;
      case 'Application Process':
        details.applicationProcess = content.text().trim();
        break;
      case 'Documents Required':
        details.documentsRequired = content.text().trim();
        break;
      case 'Mailing Address':
        details.mailingAddress = content.html()?.trim().replace(/<br\s*\/?>/gi, ', ');
        break;
      case 'Languages':
        details.languages = content.text().trim();
        break;
      case 'Fees':
        details.fees = content.text().trim();
        break;
      case 'Accessibility':
        details.accessibility = content.text().trim();
        break;
      case 'Hours of Operation':
        details.hoursOfOperation = content.html()?.trim().replace(/<br\s*\/?>/gi, ', ').replace(/<div[^>]*>/gi, ', ');
        break;
      case 'Service Area(s)':
        details.serviceAreas = content.text().trim();
        break;
      case 'Last Updated On':
        details.lastUpdated = content.text().trim();
        break;
    }
  });

  // Extract Google Maps link
  const mapsLink = $('a.link[href*="google.ca/maps"]').attr('href');
  if (mapsLink) {
    details.googleMapsLink = mapsLink;
  }

  return details;
}

async function enrichServices() {
  console.log('🔄 Starting service enrichment...\n');

  const dataDir = path.join(process.cwd(), 'data');
  const mergedPath = path.join(dataDir, 'merged_services.json');

  if (!fs.existsSync(mergedPath)) {
    console.error('❌ merged_services.json not found! Run "npm run merge" first.');
    process.exit(1);
  }

  const mergedData = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));
  const services: Service[] = mergedData.services;

  console.log(`📊 Total services to enrich: ${services.length}\n`);

  const enrichedServices: EnrichedService[] = [];

  // Process in batches of 3 to avoid rate limits
  const BATCH_SIZE = 3;
  const BATCH_DELAY = 2000;

  for (let i = 0; i < services.length; i += BATCH_SIZE) {
    const batch = services.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(services.length / BATCH_SIZE);

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} services)`);
    console.log('-'.repeat(60));

    const batchPromises = batch.map(async (service, idx) => {
      const globalIdx = i + idx;
      const progress = `[${globalIdx + 1}/${services.length}]`;

      console.log(`${progress} Fetching details: ${service.name}`);

      const details = await fetchServiceDetails(service.id);

      console.log(`${progress} ✅ Enriched: ${service.name}`);

      return {
        ...service,
        details: details || undefined
      };
    });

    const batchResults = await Promise.all(batchPromises);
    enrichedServices.push(...batchResults);

    // Save progress after each batch
    const result = {
      ...mergedData,
      services: enrichedServices,
      enrichedAt: new Date().toISOString(),
      totalEnriched: enrichedServices.length
    };

    const outputPath = path.join(dataDir, 'enriched_services.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`💾 Progress saved: ${enrichedServices.length}/${services.length} services`);

    // Delay between batches
    if (i + BATCH_SIZE < services.length) {
      console.log(`\n⏳ Waiting ${BATCH_DELAY/1000}s before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Enrichment completed!');
  console.log('='.repeat(60) + '\n');
  console.log(`💾 Saved to: data/enriched_services.json`);
  console.log(`📊 Total services enriched: ${enrichedServices.length}\n`);
}

enrichServices().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
