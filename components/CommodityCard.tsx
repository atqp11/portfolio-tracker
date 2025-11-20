// components/CommodityCard.tsx
export default function CommodityCard({ name, price, ts }: { name: string; price: number; ts: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg text-center sm:text-left">
      <p className="font-medium text-sm sm:text-base truncate text-gray-900 dark:text-gray-100">{name}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
        ${price.toFixed(name.includes('Copper') ? 3 : 2)}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{ts}</p>
    </div>
  );
}