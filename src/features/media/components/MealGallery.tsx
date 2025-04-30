import React from 'react';
import type { MediaAsset } from '@/types'; // Assuming MediaAsset type is defined
import Image from 'next/image';

interface MealGalleryProps {
  mealMediaIds: string[]; // Array of media IDs related to a meal or meal type
  // TODO: Add props for layout (e.g., horizontal scroll, grid), interactivity
}

// Placeholder function to fetch multiple media assets
// In a real app, this might fetch from a DB, CMS, or filter from a state store
const getMediaAssetsByIds = (ids: string[]): MediaAsset[] => {
    // --- Mock Data (using same assets as ExerciseVideo for now) --- 
    const MOCK_MEDIA_ASSETS: Record<string, MediaAsset> = {
        'meal-img-1': {
            id: 'meal-img-1',
            type: 'IMAGE',
            url: '/media/meals/meal1.jpg', // Example path
            description: 'High-protein chicken and quinoa bowl.',
            tags: ['meal', 'lunch', 'high-protein', 'lactose-free'],
        },
        'meal-img-2': {
            id: 'meal-img-2',
            type: 'IMAGE',
            url: '/media/meals/meal2.jpg',
            description: 'Salmon with roasted vegetables.',
            tags: ['meal', 'dinner', 'omega-3', 'lactose-free'],
        },
        'meal-vid-1': {
             id: 'meal-vid-1',
             type: 'VIDEO',
             url: '/media/meals/smoothie-prep.mp4',
             thumbnail: '/media/meals/smoothie-thumb.jpg',
             description: 'Quick prep video for a lactose-free protein smoothie.',
             tags: ['meal', 'snack', 'video', 'lactose-free'],
        }
    };
    // --- End Mock Data --- 
    
    return ids.map(id => MOCK_MEDIA_ASSETS[id]).filter((asset): asset is MediaAsset => asset !== null && asset !== undefined);
};

const MealGallery: React.FC<MealGalleryProps> = ({ mealMediaIds }) => {
    const assets = getMediaAssetsByIds(mealMediaIds);

    if (assets.length === 0) {
        // Optionally render nothing or a placeholder if no media IDs provided/found
        return null; 
    }

    // Basic horizontal scroll layout - replace with proper carousel/swiper later if needed
    return (
        <div className="mb-4">
            <h4 className="text-md font-semibold mb-2">Meal Ideas / Examples</h4>
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-transparent">
                {assets.map((asset) => (
                    <div key={asset.id} className="flex-shrink-0 w-48 border rounded-lg overflow-hidden shadow-md bg-card">
                        {asset.type === 'IMAGE' && (
                            <Image 
                                src={asset.url} 
                                alt={asset.description || `Meal image ${asset.id}`}
                                width={192} 
                                height={108} // ~16:9 aspect ratio for consistency
                                className="w-full h-28 object-cover" // Fixed height, cover fit
                            />
                        )}
                        {asset.type === 'VIDEO' && (
                             <div className="relative w-full h-28"> {/* Container for aspect ratio */} 
                                 <video 
                                     controls 
                                     poster={asset.thumbnail}
                                     className="w-full h-full object-cover" 
                                     preload="metadata"
                                 >
                                     <source src={asset.url} type="video/mp4" />
                                     Your browser does not support the video tag.
                                 </video>
                             </div>
                        )}
                        {/* GIFs could be handled similarly to Images */}
                        
                        {asset.description && (
                            <p className="p-2 text-xs text-muted-foreground">
                                {asset.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MealGallery; 