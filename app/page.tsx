'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomDropdown from './components/CustomDropdown';
import ServiceCardSkeleton from './components/ServiceCardSkeleton';
import Badge from './components/Badge';
import Button from './components/Button';
import StatCard from './components/StatCard';

interface ServiceData {
  services: Service[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalServices: number;
    limit: number;
  };
  stats: {
    totalUniqueServices: number;
    servicesInBothLocations: number;
    servicesOnlyInHalton: number;
    servicesOnlyInMississauga: number;
  };
  locations: string[];
}

interface Service {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  address: string;
  website: string;
  locations: string[];
  subtopicIds: string[];
  details?: {
    eligibility?: string;
    fees?: string;
    languages?: string;
    hoursOfOperation?: string;
    accessibility?: string;
  };
}

interface SearchResult extends Service {
  similarity?: number;
  rank?: number;
}

export default function Home() {
  const [data, setData] = useState<ServiceData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [showSemanticResults, setShowSemanticResults] = useState(false);

  // Regular search effect
  useEffect(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '10',
      search: '',
      location: selectedLocation,
    });

    fetch(`/api/services?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.error('Error fetching services:', error);
      });
  }, [currentPage, selectedLocation]);

  // Handle AI search button click
  const handleAiSearch = () => {
    if (!aiSearchQuery.trim()) return;

    setIsSearching(true);
    setShowSemanticResults(true);

    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: aiSearchQuery,
        limit: 10,
        minScore: 0.5,
        locations: selectedLocation !== 'all' ? [selectedLocation] : undefined,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          setSemanticResults(response.results);
        }
        setIsSearching(false);
      })
      .catch((error) => {
        console.error('Error performing semantic search:', error);
        setIsSearching(false);
      });
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    setCurrentPage(1);
  };

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    { value: 'Halton', label: 'Halton' },
    { value: 'Mississauga', label: 'Mississauga' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary-600 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">211 Services Directory</h1>
          <p className="mt-2 text-primary-100">
            Enriched community services for Halton and Mississauga
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Overview */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-t-4 border-primary-500">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">Statistics Overview</h2>
          {!data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-primary-50 rounded-lg p-6 border border-primary-100 animate-pulse">
                  <div className="h-4 bg-primary-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-primary-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                label="Total Services"
                value={data.stats.totalUniqueServices}
              />
              <StatCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                label="Both Locations"
                value={data.stats.servicesInBothLocations}
              />
              <StatCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Halton Only"
                value={data.stats.servicesOnlyInHalton}
              />
              <StatCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                label="Mississauga Only"
                value={data.stats.servicesOnlyInMississauga}
              />
            </div>
          )}
        </div>

        {/* AI Semantic Search */}
        <div className="bg-gradient-to-br from-purple-50 to-primary-50 rounded-xl shadow-md p-6 mb-8 border border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-2xl font-bold text-neutral-800">AI-Powered Search</h2>
          </div>
          <p className="text-sm text-neutral-600 mb-4">
            Describe what you need in natural language. Our AI understands meaning, not just keywords.
          </p>

          {/* Search Input and Location Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiSearch()}
                placeholder='e.g., "help for domestic violence victims" or "mental health support for children"'
                className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <CustomDropdown
                options={locationOptions}
                value={selectedLocation}
                onChange={handleLocationChange}
                label=""
                placeholder="Filter by Location"
              />
            </div>
          </div>

          {/* Search Button */}
          <div>
            <button
              onClick={handleAiSearch}
              disabled={!aiSearchQuery.trim() || isSearching}
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search with AI
                </>
              )}
            </button>
          </div>
          {showSemanticResults && (
            <div className="mt-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 border border-purple-300 text-purple-700 text-sm font-medium rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Found {semanticResults.length} AI-matched results
              </div>
              <button
                onClick={() => {
                  setShowSemanticResults(false);
                  setAiSearchQuery('');
                  setSemanticResults([]);
                }}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear AI search
              </button>
            </div>
          )}
        </div>


        {/* Services List */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 text-neutral-800">
            {showSemanticResults ? 'AI Search Results' : 'Services'}
          </h2>
          <div className="space-y-4">
            {showSemanticResults ? (
              // Semantic search results
              isSearching ? (
                Array.from({ length: 5 }).map((_, i) => <ServiceCardSkeleton key={i} />)
              ) : semanticResults.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  No services found matching your AI search
                </div>
              ) : (
                semanticResults.map((service) => (
                  <div
                    key={service.id}
                    className="group bg-white border border-neutral-200 rounded-lg p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-neutral-800">
                            {service.name}
                          </h3>
                          {service.similarity && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {(service.similarity * 100).toFixed(0)}% match
                            </span>
                          )}
                        </div>
                        {service.subtitle && (
                          <p className="text-base text-primary-600 font-medium mt-1">
                            {service.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4 flex-wrap justify-end">
                        {service.locations.map((loc) => (
                          <Badge
                            key={loc}
                            variant="primary"
                            icon={
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            }
                          >
                            {loc}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div
                      className="text-neutral-600 text-sm mb-4 line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: service.description.substring(0, 300) + '...',
                      }}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                      {service.address && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <span className="font-medium text-neutral-700">Address: </span>
                            <span className="text-neutral-600">{service.address}</span>
                          </div>
                        </div>
                      )}
                      {service.details?.languages && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <div>
                            <span className="font-medium text-neutral-700">Languages: </span>
                            <span className="text-neutral-600">{service.details.languages}</span>
                          </div>
                        </div>
                      )}
                      {service.details?.fees && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="font-medium text-neutral-700">Fees: </span>
                            <span className="text-neutral-600">{service.details.fees}</span>
                          </div>
                        </div>
                      )}
                      {service.details?.accessibility && (
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <span className="font-medium text-neutral-700">Accessibility: </span>
                            <span className="text-neutral-600">
                              {service.details.accessibility}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <Link href={`/service/${service.id}`}>
                      <Button
                        variant="primary"
                        size="md"
                        icon={
                          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        }
                        iconPosition="right"
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))
              )
            ) : !data ? (
              // Show skeleton loaders while loading
              Array.from({ length: 10 }).map((_, i) => <ServiceCardSkeleton key={i} />)
            ) : data.services.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                No services found matching your criteria
              </div>
            ) : (
              data.services.map((service) => (
                <div
                  key={service.id}
                  className="group bg-white border border-neutral-200 rounded-lg p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-neutral-800">
                        {service.name}
                      </h3>
                      {service.subtitle && (
                        <p className="text-base text-primary-600 font-medium mt-1">
                          {service.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4 flex-wrap justify-end">
                      {service.locations.map((loc) => (
                        <Badge
                          key={loc}
                          variant="primary"
                          icon={
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          }
                        >
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div
                    className="text-neutral-600 text-sm mb-4 line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: service.description.substring(0, 300) + '...',
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                    {service.address && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <span className="font-medium text-neutral-700">Address: </span>
                          <span className="text-neutral-600">{service.address}</span>
                        </div>
                      </div>
                    )}
                    {service.details?.languages && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <div>
                          <span className="font-medium text-neutral-700">Languages: </span>
                          <span className="text-neutral-600">{service.details.languages}</span>
                        </div>
                      </div>
                    )}
                    {service.details?.fees && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span className="font-medium text-neutral-700">Fees: </span>
                          <span className="text-neutral-600">{service.details.fees}</span>
                        </div>
                      </div>
                    )}
                    {service.details?.accessibility && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span className="font-medium text-neutral-700">Accessibility: </span>
                          <span className="text-neutral-600">
                            {service.details.accessibility}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link href={`/service/${service.id}`}>
                    <Button
                      variant="primary"
                      size="md"
                      icon={
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      }
                      iconPosition="right"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {data && data.services.length > 0 && data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="flex gap-1">
                {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === data.pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    const showEllipsis =
                      (page === 2 && currentPage > 3) ||
                      (page === data.pagination.totalPages - 1 &&
                        currentPage < data.pagination.totalPages - 2);

                    if (showEllipsis) {
                      return (
                        <span key={page} className="px-3 py-2.5 text-neutral-500">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.5rem] px-4 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 font-medium ${
                          currentPage === page
                            ? 'bg-primary-600 !text-white border-primary-600 shadow-sm'
                            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:shadow-sm'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() =>
                  setCurrentPage(Math.min(data.pagination.totalPages, currentPage + 1))
                }
                disabled={currentPage === data.pagination.totalPages}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
