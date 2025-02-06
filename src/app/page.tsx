"use client";

import dynamic from 'next/dynamic';

const GraphSearchVisualization = dynamic(
  () => import('@/components/GraphSearchVisualization'),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <GraphSearchVisualization />
    </div>  
  );
}
