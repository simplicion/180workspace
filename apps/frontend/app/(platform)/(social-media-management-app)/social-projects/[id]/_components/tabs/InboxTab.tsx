'use client';

import React from 'react';
import { SocialProject } from '@/lib/services/social-project.service';
import InboxWorkspace from '../../../../_components/inbox/InboxWorkspace';

interface InboxTabProps {
    project: SocialProject;
}

/** Project-scoped inbox (same workspace as /inbox, filtered to this project). */
export const InboxTab: React.FC<InboxTabProps> = ({ project }) => <InboxWorkspace projectId={project.id} />;
