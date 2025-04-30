"use client";

import React from 'react';
import type { MediaAsset } from '@/types'; // Assuming MediaAsset type is defined
import Image from 'next/image';

interface ExerciseVideoProps {
    mediaId: string; // ID to fetch the specific media asset
    // TODO: Add props for controlling playback, display size, etc.
}

// Placeholder function to fetch media asset data by ID
// In a real app, this might fetch from a DB, CMS, or state store
const getMediaAssetById = (id: string): MediaAsset | null => {
    // --- Mock Data --- 
    const MOCK_MEDIA_ASSETS: Record<string, MediaAsset> = {
        'plank-demo': {
            id: 'plank-demo',
            type: 'VIDEO',
            url: '/media/videos/plank.mp4', // Example path
            thumbnail: '/media/thumbnails/plank.jpg',
            description: 'Standard plank demonstration. Keep your back straight.',
            tags: ['core', 'plank', 'beginner'],
        },
        'pullup-demo': {
            id: 'pullup-demo',
            type: 'VIDEO',
            url: '/media/videos/pullup.mp4',
            thumbnail: '/media/thumbnails/pullup.jpg',
            description: 'Pull-up demonstration.',
            tags: ['strength', 'pullup', 'intermediate'],
        },
        'mobility-demo': {
             id: 'mobility-demo',
             type: 'GIF', // Example using GIF
             url: '/media/gifs/cat-camel.gif',
             description: 'Cat-Camel stretch for back mobility.',
             tags: ['mobility', 'back_care', 'beginner'],
        }
    };
    // --- End Mock Data --- 
    
    return MOCK_MEDIA_ASSETS[id] || null;
};

const ExerciseVideo: React.FC<ExerciseVideoProps> = ({ mediaId }) => {
    const asset = getMediaAssetById(mediaId);

    if (!asset) {
        return <div className="text-red-500">Media not found: {mediaId}</div>;
    }

    return (
        <div className="border rounded-lg overflow-hidden shadow-md">
            {asset.type === 'VIDEO' && (
                <video 
                    controls 
                    poster={asset.thumbnail}
                    className="w-full aspect-video" // Maintain aspect ratio
                    preload="metadata" // Load basic info quickly
                >
                    <source src={asset.url} type="video/mp4" /> 
                    {/* Add other formats if needed (webm, ogg) */}
                    Your browser does not support the video tag.
                </video>
            )}
            {asset.type === 'GIF' && (
                 <Image 
                     src={asset.url} 
                     alt={asset.description || `GIF for ${mediaId}`}
                     width={500} // Provide appropriate dimensions
                     height={300}
                     className="w-full object-contain" // Adjust object fit as needed
                 />
            )}
            {asset.type === 'IMAGE' && (
                <Image 
                    src={asset.url} 
                    alt={asset.description || `Image for ${mediaId}`}
                    width={500} 
                    height={300}
                    className="w-full object-cover" 
                />
            )}

            {asset.description && (
                <p className="p-2 text-sm text-muted-foreground bg-secondary">
                    {asset.description}
                </p>
            )}
        </div>
    );
};

export default ExerciseVideo; 