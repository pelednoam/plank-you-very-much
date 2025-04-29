"use client";

import React from 'react';
import { useMediaStore } from '@/store/mediaStore';
import Image from 'next/image'; // Use Next.js Image for optimization

interface MealMediaDisplayProps {
    mediaIds?: string[];
    className?: string;
}

const MealMediaDisplay: React.FC<MealMediaDisplayProps> = ({ mediaIds, className }) => {
    const getAssetById = useMediaStore((state) => state.getAssetById);

    if (!mediaIds || mediaIds.length === 0) {
        return null; // No media to display
    }

    // Find the first asset that is an image and has a URL
    const firstImageAsset = mediaIds
        .map(id => getAssetById(id))
        .find(asset => asset?.type === 'IMAGE' && asset.url);

    if (!firstImageAsset) {
        return null; // No suitable image asset found
    }

    // Use thumbnail if available, otherwise fallback to main URL
    const imageUrl = firstImageAsset.thumbnail || firstImageAsset.url;

    return (
        <div className={`relative overflow-hidden rounded ${className || 'w-16 h-16'}`}> 
            <Image
                src={imageUrl}
                alt={firstImageAsset.description || 'Meal image'}
                layout="fill" 
                objectFit="cover" 
                // Add placeholder and blurDataURL for better loading experience if needed
                // placeholder="blur"
                // blurDataURL="..."
                onError={(e) => { 
                    // Optional: Handle image loading errors (e.g., show a fallback)
                    console.error("Failed to load meal image:", imageUrl, e);
                    (e.target as HTMLImageElement).style.display = 'none'; // Hide broken image icon
                }}
            />
        </div>
    );
};

export default MealMediaDisplay; 