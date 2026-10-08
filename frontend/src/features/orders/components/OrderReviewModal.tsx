'use client';

import React, { useState } from 'react';
import { useCreateOrderReview } from '@/features/orders/hooks/useCreateOrderReview';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderReviewModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const StarRating = ({ rating, setRating, label }: { rating: number; setRating: (val: number) => void; label: string }) => {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`transition-colors ${star <= rating ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-zinc-600'}`}
          >
            <Star className="w-8 h-8 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const OrderReviewModal = ({ orderId, isOpen, onClose }: OrderReviewModalProps) => {
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tempImageUrl, setTempImageUrl] = useState('');
  
  const createReview = useCreateOrderReview(orderId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReview.mutate(
      {
        restaurant_rating: restaurantRating || undefined,
        driver_rating: driverRating || undefined,
        food_rating: foodRating || undefined,
        comment: comment || undefined,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {
          alert('Failed to submit review');
        }
      }
    );
  };

  const handleAddImage = () => {
    if (tempImageUrl) {
      setImageUrls([...imageUrls, tempImageUrl]);
      setTempImageUrl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Leave a Review</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <StarRating rating={restaurantRating} setRating={setRestaurantRating} label="Restaurant Rating" />
          <StarRating rating={foodRating} setRating={setFoodRating} label="Food Rating" />
          <StarRating rating={driverRating} setRating={setDriverRating} label="Driver Rating" />
          
          <div className="flex flex-col gap-2 mb-4">
            <span className="text-sm font-semibold text-zinc-300">Comments</span>
            <textarea
              className="w-full p-3 bg-zinc-950 border border-white/10 text-white rounded-lg resize-none min-h-[100px] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <span className="text-sm font-semibold text-zinc-300">Add Images (URLs)</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={tempImageUrl}
                onChange={(e) => setTempImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 p-2 bg-zinc-950 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <Button type="button" onClick={handleAddImage} variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0">Add</Button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {imageUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`Review img ${i}`} className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" disabled={createReview.isPending} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0">
              {createReview.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
