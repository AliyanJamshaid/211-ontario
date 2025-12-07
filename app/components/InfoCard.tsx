import React from 'react';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
  fullWidth?: boolean;
}

export default function InfoCard({ icon, title, content, fullWidth = false }: InfoCardProps) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-primary-500 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-800 mb-2">
            {title}
          </h3>
          <div className="text-neutral-600 leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
