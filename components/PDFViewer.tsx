'use client';
import React from 'react';

interface PDFViewerProps {
  url: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url }) => {
  return (
    <div className="w-full h-[80vh] p-4 bg-gray-50 flex items-center justify-center">
      <iframe
        src={url}
        className="w-full h-full border border-gray-300 rounded-lg shadow-lg"
        title="PDF Preview"
      />
    </div>
  );
};
