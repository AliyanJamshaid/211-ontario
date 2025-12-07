'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import InfoCard from '../../components/InfoCard';

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
    detailsHTML?: string;
    fullDescription?: string;
    eligibility?: string;
    fees?: string;
    languages?: string;
    hoursOfOperation?: string;
    accessibility?: string;
    applicationProcess?: string;
    serviceAreas?: string;
  };
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/services/${params.id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Service not found');
          }
          return res.json();
        })
        .then((data) => {
          setService(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching service:', error);
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header Skeleton */}
        <header className="bg-primary-600 text-white py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="mb-4 h-6 w-32 bg-primary-500 rounded animate-pulse"></div>
            <div className="h-9 w-96 bg-primary-500 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-64 bg-primary-500 rounded animate-pulse"></div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Service Header Info Skeleton */}
            <div className="bg-primary-50 p-6 border-b border-primary-200">
              <div className="flex gap-3 mb-4">
                <div className="h-7 w-24 bg-primary-200 rounded-full animate-pulse"></div>
                <div className="h-7 w-32 bg-primary-200 rounded-full animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-16 bg-primary-100 rounded animate-pulse"></div>
                <div className="h-16 bg-primary-100 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="p-6">
              {/* Description Skeleton */}
              <div className="mb-8">
                <div className="h-8 w-48 bg-neutral-200 rounded mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>

              {/* Details Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <div className="h-6 w-32 bg-neutral-200 rounded mb-3 animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-neutral-200 rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-neutral-200">
                <div className="h-12 w-48 bg-neutral-200 rounded-lg animate-pulse"></div>
                <div className="h-12 w-56 bg-primary-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="text-xl text-error-700 mb-4">Service not found</div>
          <Link href="/">
            <Button variant="primary">
              Back to Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-white hover:text-primary-100 transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Services
          </button>
          <h1 className="text-3xl font-bold">{service.name}</h1>
          {service.subtitle && (
            <p className="mt-2 text-primary-100 text-lg">{service.subtitle}</p>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Service Header Info */}
          <div className="bg-primary-50 p-6 border-b border-primary-200">
            <div className="flex flex-wrap gap-3 mb-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.address && (
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 mb-1">
                      Address
                    </h3>
                    <p className="text-neutral-900">{service.address}</p>
                  </div>
                </div>
              )}
              {service.website && (
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700 mb-1">
                      Website
                    </h3>
                    <a
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline break-all"
                    >
                      Visit Official Website
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Full Description */}
            {service.details?.fullDescription && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-800 mb-4">
                  Description
                </h2>
                <div
                  className="prose max-w-none text-neutral-700"
                  dangerouslySetInnerHTML={{
                    __html: service.details.fullDescription,
                  }}
                />
              </div>
            )}

            {/* Service Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {service.details?.eligibility && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Eligibility"
                  content={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: service.details.eligibility,
                      }}
                    />
                  }
                />
              )}

              {service.details?.fees && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Fees"
                  content={
                    <div
                      dangerouslySetInnerHTML={{ __html: service.details.fees }}
                    />
                  }
                />
              )}

              {service.details?.languages && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  }
                  title="Languages"
                  content={<p>{service.details.languages}</p>}
                />
              )}

              {service.details?.accessibility && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Accessibility"
                  content={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: service.details.accessibility,
                      }}
                    />
                  }
                />
              )}

              {service.details?.hoursOfOperation && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Hours of Operation"
                  content={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: service.details.hoursOfOperation,
                      }}
                    />
                  }
                />
              )}

              {service.details?.serviceAreas && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  }
                  title="Service Areas"
                  content={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: service.details.serviceAreas,
                      }}
                    />
                  }
                />
              )}

              {service.details?.applicationProcess && (
                <InfoCard
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  title="Application Process"
                  content={
                    <div
                      dangerouslySetInnerHTML={{
                        __html: service.details.applicationProcess,
                      }}
                    />
                  }
                  fullWidth={true}
                />
              )}
            </div>

            {/* Full Details HTML (if available) */}
            {service.details?.detailsHTML && (
              <div className="border-t border-neutral-200 pt-8">
                <h2 className="text-2xl font-bold text-neutral-800 mb-4">
                  Complete Service Information
                </h2>
                <div
                  className="prose max-w-none service-details"
                  dangerouslySetInnerHTML={{
                    __html: service.details.detailsHTML,
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-neutral-200">
              <Link href="/">
                <Button variant="secondary" size="lg">
                  Back to All Services
                </Button>
              </Link>
              {service.website && (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    }
                    iconPosition="right"
                  >
                    Visit Official Website
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
