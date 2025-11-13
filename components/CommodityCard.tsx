// components/CommodityCard.tsx
export default function CommodityCard({ name, price, ts }: { name: string; price: number; ts: string }) {
  return (
    <div className="bg-[#0E1114] border border-neutral-800 p-4 rounded-lg text-center sm:text-left">
      <p className="font-medium text-sm sm:text-base truncate text-[#E5E7EB]">{name}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1 text-[#E5E7EB]">
        ${price.toFixed(name.includes('Copper') ? 3 : 2)}
      </p>
      <p className="text-xs text-[#9CA3AF] mt-1">{ts}</p>
    </div>
  );
}