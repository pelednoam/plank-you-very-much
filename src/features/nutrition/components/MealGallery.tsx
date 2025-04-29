"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useMediaStore } from '@/store/mediaStore';
import type { MediaAsset } from '@/types';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react'; // Import Embla hook
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Icons for buttons
import { Button } from '@/components/ui/button'; // Button component

interface MealGalleryProps {
    className?: string;
}

const MealGallery: React.FC<MealGalleryProps> = ({ className }) => {
    const { findAssetsByTag } = useMediaStore((state) => ({ 
        findAssetsByTag: state.findAssetsByTag 
    }));
    const [mealAssets, setMealAssets] = useState<MediaAsset[]>([]);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' }); // Initialize Embla

    useEffect(() => {
        const allMealAssets = findAssetsByTag('meal');
        const imageAssets = allMealAssets.filter(asset => asset.type === 'IMAGE');
        setMealAssets(imageAssets);
    }, [findAssetsByTag]);

    // Button handlers
    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

     // State for button enabled/disabled status
    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setPrevBtnDisabled(!emblaApi.canScrollPrev());
        setNextBtnDisabled(!emblaApi.canScrollNext());
    }, [emblaApi]);

     useEffect(() => {
        if (!emblaApi) return;
        onSelect(); // Set initial button states
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect); // Re-check on resize etc.
        return () => {
            emblaApi.off('select', onSelect);
             emblaApi.off('reInit', onSelect);
        }; // Cleanup listeners
    }, [emblaApi, onSelect]);


    if (mealAssets.length === 0) {
        return <p className={`text-gray-500 ${className}`}>No meal images available.</p>;
    }

    return (
        <div className={`relative ${className}`}>
            {/* Carousel Viewport */} 
             <div className="overflow-hidden rounded" ref={emblaRef}>
                {/* Container with slides */}
                 <div className="flex touch-pan-y"> {/* Enable vertical scroll on touch devices */} 
                    {mealAssets.map(asset => (
                        <div key={asset.id} className="flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 p-1"> {/* Slide sizing */} 
                             <div className="border rounded overflow-hidden shadow group relative aspect-square bg-gray-100">
                                <Image 
                                    src={asset.url} 
                                    alt={asset.description || 'Meal image'}
                                    layout="fill"
                                    objectFit="cover"
                                />
                                {asset.description && (
                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center">
                                        {asset.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             {/* Prev/Next Buttons */}
             {mealAssets.length > 4 && ( // Only show buttons if scrolling is likely needed
                 <>
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full h-8 w-8 p-0 disabled:opacity-30"
                        onClick={scrollPrev}
                        disabled={prevBtnDisabled}
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="sr-only">Previous slide</span>
                    </Button>
                    <Button
                         variant="outline"
                         size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 rounded-full h-8 w-8 p-0 disabled:opacity-30"
                        onClick={scrollNext}
                        disabled={nextBtnDisabled}
                    >
                        <ChevronRight className="h-5 w-5" />
                        <span className="sr-only">Next slide</span>
                    </Button>
                </>
            )}
        </div>
    );
};

export default MealGallery; 