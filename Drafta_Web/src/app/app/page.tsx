"use client";

import dynamic from 'next/dynamic';
import { WorkspaceView } from '@/components/workspace-view';

const CloudSession = dynamic(() => import('@/components/cloud-session'), { ssr: false });
export default function Page() {
  return <CloudSession Workspace={WorkspaceView} />;
}
