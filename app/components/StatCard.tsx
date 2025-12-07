import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

export default function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-primary-50 border border-primary-100 rounded-lg p-6 hover:shadow-primary transition-all duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 mb-3 rounded-full bg-primary-100 flex items-center justify-center">
          <div className="text-primary-600">
            {icon}
          </div>
        </div>
        <p className="text-sm font-medium text-neutral-600 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-4xl font-bold text-primary-700">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
