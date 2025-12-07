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
        className="border bg-gray-800 text-gray-100 p-2 rounded w-64"
      />
      <select 
        name="tier" 
        onChange={handleSelectChange} 
        defaultValue={searchParams.get('tier') || ''}
        className="border bg-gray-800 text-gray-100 p-2 rounded"
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
        className="border bg-gray-800 text-gray-100 p-2 rounded"
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
