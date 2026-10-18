'use client';

interface PageSizeSelectorProps {
  pageSize: number;
  onChange: (newSize: number) => void;
  options?: number[];
  label?: string;
}

export function PageSizeSelector({
  pageSize,
  onChange,
  options = [10, 15, 20, 50, 100],
  label = 'Hiển thị:',
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span>{label}</span>
      <select
        value={pageSize}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-zinc-900 text-zinc-100">
            {opt} / trang
          </option>
        ))}
      </select>
    </div>
  );
}
