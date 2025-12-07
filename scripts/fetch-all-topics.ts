import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface Subtopic {
  id: string;
  heading: string;
  description: string;
}

interface Topic {
  id: string;
  name: string;
  icon: string;
  subtopics: Subtopic[];
}

const MAIN_TOPICS = [
  { id: '1', name: 'Abuse / Assault', icon: 'fa fa-exclamation-triangle' },
  { id: '8', name: 'Community Programs', icon: 'fa fa-book' },
  { id: '15', name: 'Disabilities', icon: 'fa fa-wheelchair' },
  { id: '27', name: 'Emergency / Crisis', icon: 'fa fa-ambulance' },
  { id: '34', name: 'Employment / Training', icon: 'fa fa-money-bill' },
  { id: '50', name: 'Family services', icon: 'fa fa-child' },
  { id: '57', name: 'Financial Assistance', icon: 'fa fa-life-ring' },
  { id: '67', name: 'Food', icon: 'fa fa-bread-slice' },
  { id: '80', name: 'Francophones', icon: 'fa fa-user-friends' },
  { id: '82', name: 'Government / Legal', icon: 'fa fa-balance-scale' },
  { id: '90', name: 'Health Care', icon: 'fa fa-first-aid' },
  { id: '102', name: 'Homelessness', icon: 'fa fa-bed' },
  { id: '107', name: 'Housing', icon: 'fa fa-home' },
  { id: '118', name: 'Indigenous Peoples', icon: 'fa fa-feather-alt' },
  { id: '120', name: 'LGBTQ+', icon: 'fa fa-rainbow' },
  { id: '122', name: 'Mental Health / Addictions', icon: 'fa fa-head-side-brain' },
  { id: '132', name: 'Newcomers', icon: 'fa fa-plane-arrival' },
  { id: '143', name: 'Older Adults', icon: 'fa fa-heart' },
  { id: '151', name: 'Youth', icon: 'fa fa-head-side-headphones' },
];

async function fetchSubtopics(topicId: string): Promise<Subtopic[]> {
  const url = 'https://211ontario.ca/wp-content/plugins/dataportal/ajax-topics.php';

  try {
    const response = await axios.post(
      url,
      `id=${topicId}&dpid=0&lang=en&layout=1`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://211ontario.ca/search/'
        }
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    const subtopics: Subtopic[] = [];

    // Parse each subtopic
    $('.subtopic-heading').each((index, element) => {
      const heading = $(element).text().trim();
      const description = $(element).next('.subtopic-description').text().trim();

      // Find the "View Resources" link to extract the subtopic ID
      const button = $(element).nextAll('a.red-button').first();
      const onclickAttr = button.attr('onclick') || button.attr('href') || '';

      // Extract ID from searchByTopic('ID', ...)
      const idMatch = onclickAttr.match(/searchByTopic\('(\d+)'/);
      const id = idMatch ? idMatch[1] : '';

      if (heading && id) {
        subtopics.push({
          id,
          heading,
          description
        });
      }
    });

    return subtopics;

  } catch (error) {
    console.error(`Error fetching subtopics for topic ${topicId}:`, error);
    return [];
  }
}

async function fetchAllTopics(): Promise<Topic[]> {
  const allTopics: Topic[] = [];

  console.log('🚀 Starting to fetch all topics and subtopics...\n');

  for (const [index, mainTopic] of MAIN_TOPICS.entries()) {
    console.log(`[${index + 1}/${MAIN_TOPICS.length}] Fetching subtopics for: ${mainTopic.name} (ID: ${mainTopic.id})`);

    const subtopics = await fetchSubtopics(mainTopic.id);

    allTopics.push({
      id: mainTopic.id,
      name: mainTopic.name,
      icon: mainTopic.icon,
      subtopics
    });

    console.log(`   ✅ Found ${subtopics.length} subtopics\n`);

    // Delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allTopics;
}

async function main() {
  console.log('='.repeat(60));
  console.log('211 ONTARIO - FETCH ALL TOPICS AND SUBTOPICS');
  console.log('='.repeat(60) + '\n');

  const topics = await fetchAllTopics();

  // Save to JSON
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, 'all-topics-with-subtopics.json');
  fs.writeFileSync(filepath, JSON.stringify(topics, null, 2));

  // Calculate totals
  const totalSubtopics = topics.reduce((sum, topic) => sum + topic.subtopics.length, 0);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Fetch completed!');
  console.log('='.repeat(60) + '\n');

  console.log(`💾 Saved to: data/all-topics-with-subtopics.json`);
  console.log(`📊 Total main topics: ${topics.length}`);
  console.log(`📊 Total subtopics: ${totalSubtopics}\n`);

  // Print summary
  console.log('📋 SUMMARY:\n');
  topics.forEach((topic, i) => {
    console.log(`${i + 1}. ${topic.name} (ID: ${topic.id})`);
    console.log(`   └─ ${topic.subtopics.length} subtopics`);
    topic.subtopics.forEach(sub => {
      console.log(`      • ${sub.heading} (ID: ${sub.id})`);
    });
    console.log('');
  });
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
