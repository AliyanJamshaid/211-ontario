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

interface LocationData {
  location: string;
  latitude: number;
  longitude: number;
  scrapedAt: string;
  totalSubtopics: number;
  totalServices: number;
  data: TopicData[];
}

interface MergedService extends Service {
  subtopicIds: string[];
  locations: string[];
}

async function mergeServices() {
  console.log('🔄 Starting service merge...\n');

  const dataDir = path.join(process.cwd(), 'data');

  // Load both JSON files
  const haltonPath = path.join(dataDir, 'halton_complete_services.json');
  const mississaugaPath = path.join(dataDir, 'mississauga_complete_services.json');

  if (!fs.existsSync(haltonPath) || !fs.existsSync(mississaugaPath)) {
    console.error('❌ Missing data files! Make sure both halton_complete_services.json and mississauga_complete_services.json exist.');
    process.exit(1);
  }

  const haltonData: LocationData = JSON.parse(fs.readFileSync(haltonPath, 'utf-8'));
  const mississaugaData: LocationData = JSON.parse(fs.readFileSync(mississaugaPath, 'utf-8'));

  console.log(`📍 Halton: ${haltonData.totalServices} services`);
  console.log(`📍 Mississauga: ${mississaugaData.totalServices} services\n`);

  // Create a map to track all unique services by ID
  const serviceMap = new Map<string, MergedService>();

  // Process Halton services
  haltonData.data.forEach(topicData => {
    topicData.services.forEach(service => {
      if (serviceMap.has(service.id)) {
        // Service already exists, add Halton location and subtopic
        const existing = serviceMap.get(service.id)!;
        if (!existing.locations.includes('Halton')) {
          existing.locations.push('Halton');
        }
        if (!existing.subtopicIds.includes(topicData.subtopicId)) {
          existing.subtopicIds.push(topicData.subtopicId);
        }
      } else {
        // New service, add it with Halton location and subtopic
        serviceMap.set(service.id, {
          ...service,
          subtopicIds: [topicData.subtopicId],
          locations: ['Halton']
        });
      }
    });
  });

  // Process Mississauga services
  mississaugaData.data.forEach(topicData => {
    topicData.services.forEach(service => {
      if (serviceMap.has(service.id)) {
        // Service already exists, add Mississauga location and subtopic
        const existing = serviceMap.get(service.id)!;
        if (!existing.locations.includes('Mississauga')) {
          existing.locations.push('Mississauga');
        }
        if (!existing.subtopicIds.includes(topicData.subtopicId)) {
          existing.subtopicIds.push(topicData.subtopicId);
        }
      } else {
        // New service, add it with Mississauga location and subtopic
        serviceMap.set(service.id, {
          ...service,
          subtopicIds: [topicData.subtopicId],
          locations: ['Mississauga']
        });
      }
    });
  });

  // Convert map to array
  const allServices = Array.from(serviceMap.values());

  // Calculate stats
  const totalUniqueServices = serviceMap.size;
  const servicesInBoth = allServices.filter(s => s.locations.length === 2).length;
  const servicesOnlyHalton = allServices.filter(s => s.locations.length === 1 && s.locations[0] === 'Halton').length;
  const servicesOnlyMississauga = allServices.filter(s => s.locations.length === 1 && s.locations[0] === 'Mississauga').length;

  // Create merged result
  const result = {
    mergedAt: new Date().toISOString(),
    locations: ['Halton', 'Mississauga'],
    totalUniqueServices,
    stats: {
      servicesInBothLocations: servicesInBoth,
      servicesOnlyInHalton: servicesOnlyHalton,
      servicesOnlyInMississauga: servicesOnlyMississauga
    },
    services: allServices
  };

  // Save to JSON
  const outputPath = path.join(dataDir, 'merged_services.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log('='.repeat(60));
  console.log('✅ Merge completed!');
  console.log('='.repeat(60) + '\n');
  console.log(`💾 Saved to: data/merged_services.json`);
  console.log(`📊 Total unique services: ${totalUniqueServices}`);
  console.log(`📊 Services in both locations: ${servicesInBoth}`);
  console.log(`📊 Services only in Halton: ${servicesOnlyHalton}`);
  console.log(`📊 Services only in Mississauga: ${servicesOnlyMississauga}\n`);
}

mergeServices().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
