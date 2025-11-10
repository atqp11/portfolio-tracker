// components/CommodityCard.tsx
export default function CommodityCard({ name, price, ts }: { name: string; price: number; ts: string }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow text-center sm:text-left">
      <p className="font-medium text-sm sm:text-base truncate">{name}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">
        ${price.toFixed(name.includes('Copper') ? 3 : 2)}
      </p>
      <p className="text-xs text-gray-500 mt-1">{ts} ET</p>
    </div>
  );
}