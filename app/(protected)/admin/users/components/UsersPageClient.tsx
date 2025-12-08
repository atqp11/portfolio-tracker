'use client';

import { useState } from 'react';
import Tabs from './Tabs';

interface UsersPageClientProps {
  usersTab: React.ReactNode;
  billingTab: React.ReactNode;
}

export default function UsersPageClient({ usersTab, billingTab }: UsersPageClientProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'billing'>('users');

  return (
    <>
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'users' && usersTab}
      {activeTab === 'billing' && billingTab}
    </>
  );
}

