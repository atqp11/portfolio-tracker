'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export default function UserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [debouncedEmail] = useDebounce(email, 500);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    const currentEmail = searchParams.get('email') || '';
    if (debouncedEmail !== currentEmail) {
      router.push(`?${createQueryString('email', debouncedEmail)}`);
    }
  }, [debouncedEmail, createQueryString, router, searchParams]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    router.push(`?${createQueryString(name, value)}`);
  };

  return (
    <div className="flex space-x-4 mb-4 items-center">
      <input
        type="text"
        name="email"
        placeholder="Search by email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <select 
        name="tier" 
        onChange={handleSelectChange} 
        defaultValue={searchParams.get('tier') || ''}
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All Tiers</option>
        <option value="free">Free</option>
        <option value="basic">Basic</option>
        <option value="premium">Premium</option>
      </select>
      <select 
        name="status" 
        onChange={handleSelectChange} 
        defaultValue={searchParams.get('status') || ''}
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="trialing">Trialing</option>
        <option value="past_due">Past Due</option>
        <option value="canceled">Canceled</option>
      </select>
    </div>
  );
}
