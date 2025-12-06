'use client';

import { useState } from 'react';

interface UserFiltersProps {
  onFilterChange: (filters: any) => void;
}

export default function UserFilters({ onFilterChange }: UserFiltersProps) {
  const [filters, setFilters] = useState({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex space-x-4 mb-4">
      <input
        type="text"
        name="email"
        placeholder="Search by email"
        onChange={handleInputChange}
        className="border p-2"
      />
      <select name="tier" onChange={handleInputChange} className="border p-2">
        <option value="">All Tiers</option>
        <option value="free">Free</option>
        <option value="basic">Basic</option>
        <option value="premium">Premium</option>
      </select>
      <select name="status" onChange={handleInputChange} className="border p-2">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="trialing">Trialing</option>
        <option value="past_due">Past Due</option>
        <option value="canceled">Canceled</option>
      </select>
    </div>
  );
}
