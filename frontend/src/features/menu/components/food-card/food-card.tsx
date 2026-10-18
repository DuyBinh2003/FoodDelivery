import { formatCurrency } from '@/lib/utils';
import { Plus, Flame } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FoodCardProps } from './types';

export default function FoodCard({ item, index, mode = 'menu' }: FoodCardProps) {
  // Deterministic gradient based on index for placeholder/fallback
  const gradients = [
    'from-orange-600/20 to-red-600/20',
    'from-amber-600/20 to-orange-600/20',
    'from-rose-600/20 to-pink-600/20',
    'from-red-600/20 to-amber-600/20',
    'from-yellow-600/20 to-orange-600/20',
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <Link href={`/restaurant/${item.restaurant_id}?item=${item.id}`}>
      <Card className="group flex flex-col p-0 gap-0 rounded-2xl overflow-hidden bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.12] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ease-out hover:-translate-y-1">
        {/* Image banner */}
        <div className="relative h-44 w-full overflow-hidden bg-zinc-900">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Flame className="w-12 h-12 text-orange-500/40 group-hover:text-orange-500/60 group-hover:scale-110 transition-all duration-500" />
            </div>
          )}

          {/* Price badge */}
          <Badge variant="secondary" className="absolute top-3 right-3 bg-black/60 hover:bg-black/70 backdrop-blur-md text-orange-400 font-bold border-none px-3 py-1 text-sm shadow-md">
            {formatCurrency(item.price)}
          </Badge>

          {/* Availability Overlay */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
              <Badge variant="destructive" className="px-4 py-1.5 text-sm font-semibold">Hết hàng</Badge>
            </div>
          )}
        </div>

        <CardContent className="flex-1 p-5 pb-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors duration-200 line-clamp-1">
            {item.name}
          </h3>
          {item.description ? (
            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{item.description}</p>
          ) : null}
          {item.restaurant_name && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{item.restaurant_name}</p>
          )}
        </CardContent>

        <CardFooter className="p-5 pt-0 border-t-0 bg-transparent">
          <div className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/5 group-hover:bg-orange-500/10 text-zinc-300 group-hover:text-orange-400 border border-white/5 group-hover:border-orange-500/20 transition-all duration-300">
            <span className="text-sm font-semibold">
              {mode === 'restaurant' ? 'Thêm vào giỏ' : 'Xem chi tiết'}
            </span>
            <Plus className="w-4 h-4" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
