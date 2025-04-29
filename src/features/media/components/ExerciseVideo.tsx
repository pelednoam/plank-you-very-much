"use client";

import React from 'react';
import { useMediaStore } from '@/store/mediaStore';
import Image from 'next/image';

interface ExerciseVideoProps {
    mediaId: string;
    className?: string;
}

const ExerciseVideo: React.FC<ExerciseVideoProps> = ({ mediaId, className }) => {
    const asset = useMediaStore((state) => state.getAssetById(mediaId));

    if (!asset) {
        console.warn(`MediaAsset with ID ${mediaId} not found.`);
        return <div className={`p-4 border rounded bg-gray-100 text-gray-500 text-center ${className}`}>Media not found.</div>;
    }

    const { type, url, thumbnail, description } = asset;

    return (
        <div className={`border rounded overflow-hidden shadow bg-white ${className || ''}`}>
            {type === 'VIDEO' && (
                <video 
                    controls 
                    preload="metadata" // Start loading metadata but not full video
                    poster={thumbnail} // Show thumbnail while loading
                    className="w-full aspect-video block" // Maintain aspect ratio
                    aria-label={description || 'Exercise video'}
                >
                    <source src={url} type="video/mp4" /> {/* Assume mp4 for now */}
                    {/* Add other source types if needed (webm, ogg) */}
                    Your browser does not support the video tag.
                </video>
            )}
            {(type === 'GIF' || type === 'IMAGE') && (
                 <div className="relative aspect-video w-full"> {/* Maintain aspect ratio for images/gifs too */} 
                    <Image 
                        src={url}
                        alt={description || 'Exercise media'}
                        layout="fill"
                        objectFit="contain" // Use contain to show the whole image/gif
                        unoptimized={type === 'GIF'} // Prevent optimization issues with GIFs
                    />
                </div>
            )}
            {description && (
                 <p className="text-sm p-2 text-gray-700 bg-gray-50 border-t">{description}</p>
            )}
        </div>
    );
};

export default ExerciseVideo; 