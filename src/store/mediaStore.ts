import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { MediaAsset } from '@/types';
import { createIdbStorage } from '@/lib/idbStorage';

interface MediaState {
  assets: MediaAsset[];
  addAsset: (assetData: Omit<MediaAsset, 'id'>) => MediaAsset;
  getAssetById: (id: string) => MediaAsset | undefined;
  findAssetsByTag: (tag: string) => MediaAsset[];
  // Load initial assets (e.g., from a static JSON or config file)
  loadInitialAssets: (initialAssets: MediaAsset[]) => void;
}

// Define some initial placeholder assets (replace with actual data)
const initialMediaAssets: MediaAsset[] = [
  {
    id: 'vid-plank-standard',
    type: 'VIDEO',
    url: '/media/videos/plank-standard.mp4',
    thumbnail: '/media/thumbnails/plank-standard.jpg',
    description: 'Standard Plank - Maintain a straight line from head to heels.',
    tags: ['core', 'plank', 'beginner', 'back-safe'],
  },
  {
    id: 'gif-cat-cow',
    type: 'GIF',
    url: '/media/gifs/cat-cow.gif',
    description: 'Cat-Cow Stretch - Mobilize the spine gently.',
    tags: ['mobility', 'back-safe', 'warmup'],
  },
  // Add more assets for climbing, swimming, other core exercises, meals etc.
];

export const useMediaStore = create(
  persist<MediaState>(
    (set, get) => ({
      assets: initialMediaAssets, // Initialize with predefined assets

      addAsset: (assetData) => {
        const newAsset: MediaAsset = {
          ...assetData,
          id: uuidv4(),
        };
        set((state) => ({ assets: [...state.assets, newAsset] }));
        return newAsset;
      },

      getAssetById: (id) => {
        return get().assets.find(a => a.id === id);
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
      name: 'media-storage',
      storage: createIdbStorage<MediaState>(),
      // Optionally, prevent initial assets from being overwritten on rehydration if they are static
      // merge: (persistedState, currentState) => { ... custom merge logic ... }
    }
  )
);

// Selectors
export const selectAllMediaAssets = (state: MediaState) => state.assets; 