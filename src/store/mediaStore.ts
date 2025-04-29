import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { MediaAsset } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';

// Placeholder data based on Spec Section 7
const placeholderMedia: MediaAsset[] = [
    {
        id: 'plank-demo-gif', // Example ID
        type: 'GIF',
        url: '/media/exercises/plank-form.gif', // Placeholder path
        description: 'Proper plank form demonstration.',
        tags: ['core', 'plank', 'form', 'back-safe']
    },
    {
        id: 'pullup-demo-video', 
        type: 'VIDEO',
        url: '/media/exercises/pullup-demo.mp4',
        thumbnail: '/media/exercises/pullup-thumb.jpg',
        description: 'Pull-up technique video.',
        tags: ['strength', 'pullup']
    },
    {
        id: 'meal-smoothie-image',
        type: 'IMAGE',
        url: '/media/meals/protein-smoothie.jpg',
        description: 'Lactose-free protein smoothie.',
        tags: ['meal', 'protein', 'lactose-free', 'quick']
    },
    {
        id: 'meal-salad-image',
        type: 'IMAGE',
        url: '/media/meals/chicken-salad.jpg',
        description: 'Grilled chicken salad with greens.',
        tags: ['meal', 'protein', 'lunch']
    }
];

interface MediaState {
  assets: MediaAsset[];
  addAsset: (assetData: Omit<MediaAsset, 'id'>) => MediaAsset;
  getAssetById: (id: string) => MediaAsset | undefined;
  findAssetsByTag: (tag: string) => MediaAsset[];
  // Load initial assets (e.g., from a static JSON or config file)
  loadInitialAssets: (initialAssets: MediaAsset[]) => void;
}

export const useMediaStore = create(
  persist<MediaState>(
    (set, get) => ({
      assets: placeholderMedia,

      addAsset: (assetData) => {
        const newAsset: MediaAsset = {
          ...assetData,
          id: uuidv4(),
        };
        set((state) => ({ assets: [...state.assets, newAsset] }));
        return newAsset;
      },

      getAssetById: (id) => {
        return get().assets.find(asset => asset.id === id);
      },

      findAssetsByTag: (tag) => {
        const lowerCaseTag = tag.toLowerCase();
        return get().assets.filter(a => a.tags.some(t => t.toLowerCase() === lowerCaseTag));
      },

      loadInitialAssets: (initialAssets) => {
        // Simple merge: adds new assets, doesn't overwrite existing by ID
        // More sophisticated merging might be needed depending on use case
        const existingIds = new Set(get().assets.map(a => a.id));
        const uniqueNewAssets = initialAssets.filter(a => !existingIds.has(a.id));
        set((state) => ({ assets: [...state.assets, ...uniqueNewAssets] }));
      },

    }),
    {
      name: 'media-asset-storage',
      storage: createIdbStorage<MediaState>(),
    }
  )
);

// Selectors
export const selectAllAssets = (state: MediaState) => state.assets; 