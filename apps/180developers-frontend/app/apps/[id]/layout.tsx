'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectProvider>{children}</ProjectProvider>;
}
