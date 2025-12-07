import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ServiceData {
  id: string;
  name: string;
  agency?: string;
  description: string;
  address: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  categories?: string[];
  hours?: string;
}

export interface ScraperOptions {
  latitude: number;
  longitude: number;
  searchLocation: string;
  searchTerms?: string;
  searchDistance?: number; // km (5, 10, 25, 50, 100)
  sortBy?: 'Distance' | 'Name' | 'string'; // 'string' is "Best Match"
  topicPath?: string;
}

export class Ontario211Scraper {
  private baseUrl = 'https://211ontario.ca';

  /**
   * Fetch all services for a given location
   */
  async fetchServices(options: ScraperOptions): Promise<ServiceData[]> {
    const {
      latitude,
      longitude,
      searchLocation,
      searchTerms = '',
      searchDistance = 25,
      sortBy = 'Distance',
      topicPath = ''
    } = options;

    const url = `${this.baseUrl}/results/?latitude=${latitude}&longitude=${longitude}&searchLocation=${encodeURIComponent(searchLocation)}&searchTerms=${encodeURIComponent(searchTerms)}&exct=0&sd=${searchDistance}&ss=${sortBy}${topicPath ? `&topicPath=${topicPath}` : ''}`;

    console.log(`Fetching services from: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
        },
      });

      return this.parseResults(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  }

  /**
   * Parse the HTML response and extract service data
   */
  private parseResults(html: string): ServiceData[] {
    const $ = cheerio.load(html);
    const services: ServiceData[] = [];

    // Find all service result items
    $('.result-item, .search-result, [data-id]').each((_, element) => {
      const $element = $(element);

      // Extract data-id if available
      const dataId = $element.attr('data-id') || '';

      // Extract service name
      const name = $element.find('.result-title, .service-name, h3, h2').first().text().trim();

      // Extract agency name
      const agency = $element.find('.agency-name, .result-agency').first().text().trim();

      // Extract description
      const description = $element.find('.result-description, .service-description, p').first().text().trim();

      // Extract address
      const address = $element.find('.result-address, .address, .location').first().text().trim();

      // Extract phone
      const phone = $element.find('.result-phone, .phone, [href^="tel:"]').first().text().trim();

      // Extract website
      const website = $element.find('.result-website, .website, [href^="http"]').first().attr('href') || '';

      // Extract email
      const email = $element.find('[href^="mailto:"]').first().attr('href')?.replace('mailto:', '') || '';

      // Extract distance
      const distance = $element.find('.result-distance, .distance').first().text().trim();

      // Extract categories/tags
      const categories: string[] = [];
      $element.find('.category, .tag, .service-category').each((_, cat) => {
        const catText = $(cat).text().trim();
        if (catText) categories.push(catText);
      });

      // Only add if we have at least a name
      if (name) {
        services.push({
          id: dataId,
          name,
          agency,
          description,
          address,
          phone,
          website,
          email,
          distance,
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    });

    return services;
  }

  /**
   * Fetch all topics available on the site
   */
  async fetchTopics(): Promise<{ id: string; name: string; icon: string }[]> {
    const url = `${this.baseUrl}/search/`;

    try {
      const response = await axios.get(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const topics: { id: string; name: string; icon: string }[] = [];

      // Extract topics from the page
      $('.topicline, .topic').each((_, element) => {
        const $element = $(element);
        const topicLink = $element.find('a[id^="topic"]');
        const topicId = topicLink.attr('id')?.replace('topic', '') || '';
        const name = topicLink.text().trim();
        const icon = $element.find('.topicicon').attr('class') || '';

        if (name && topicId) {
          topics.push({ id: topicId, name, icon });
        }
      });

      return topics;
    } catch (error) {
      console.error('Error fetching topics:', error);
      throw error;
    }
  }

  /**
   * Fetch services for all topics
   */
  async fetchAllTopicServices(options: Omit<ScraperOptions, 'topicPath'>): Promise<{
    [topicName: string]: ServiceData[];
  }> {
    const topics = await this.fetchTopics();
    const results: { [topicName: string]: ServiceData[] } = {};

    for (const topic of topics) {
      console.log(`Fetching services for topic: ${topic.name}`);
      try {
        const services = await this.fetchServices({
          ...options,
          topicPath: topic.id,
        });
        results[topic.name] = services;

        // Add delay to avoid overwhelming the server
        await this.delay(2000);
      } catch (error) {
        console.error(`Error fetching services for topic ${topic.name}:`, error);
        results[topic.name] = [];
      }
    }

    return results;
  }

  /**
   * Helper function to add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Helper function to geocode a location (you'll need to implement this with a geocoding service)
export async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  // For now, return null - you can integrate with Google Geocoding API or similar
  console.warn('Geocoding not implemented yet. Please provide latitude and longitude manually.');
  return null;
}
