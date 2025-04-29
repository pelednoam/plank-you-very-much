import { create } from 'zustand';
import type { KnowledgeCardData } from '@/types';

interface KnowledgeState {
  allCards: KnowledgeCardData[];
  filteredCards: KnowledgeCardData[];
  availableTags: string[];
  searchTerm: string;
  selectedTags: string[];
  setInitialCards: (cards: KnowledgeCardData[]) => void;
  setSearchTerm: (term: string) => void;
  setSelectedTags: (tags: string[]) => void;
  // No persistence needed for this store usually
}

// Helper to filter cards based on term and tags
const filterCards = (
    cards: KnowledgeCardData[], 
    term: string, 
    tags: string[]
): KnowledgeCardData[] => {
    const lowerCaseTerm = term.toLowerCase();
    return cards.filter(card => {
        const titleMatch = card.title.toLowerCase().includes(lowerCaseTerm);
        const contentMatch = card.markdownContent.toLowerCase().includes(lowerCaseTerm);
        const tagsMatch = tags.length === 0 || tags.every(tag => card.tags.includes(tag));
        
        return (titleMatch || contentMatch) && tagsMatch;
    });
};

// Helper to get unique tags from cards
const getUniqueTags = (cards: KnowledgeCardData[]): string[] => {
    const allTags = cards.flatMap(card => card.tags);
    return Array.from(new Set(allTags)).sort();
};

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  allCards: [],
  filteredCards: [],
  availableTags: [],
  searchTerm: '',
  selectedTags: [],

  setInitialCards: (cards) => {
    const uniqueTags = getUniqueTags(cards);
    set({
      allCards: cards,
      filteredCards: cards, // Initially, show all
      availableTags: uniqueTags,
      searchTerm: '', // Reset filters
      selectedTags: [],
    });
  },

  setSearchTerm: (term) => {
    const { allCards, selectedTags } = get();
    const newFilteredCards = filterCards(allCards, term, selectedTags);
    set({ searchTerm: term, filteredCards: newFilteredCards });
  },

  setSelectedTags: (tags) => {
    const { allCards, searchTerm } = get();
    const newFilteredCards = filterCards(allCards, searchTerm, tags);
    set({ selectedTags: tags, filteredCards: newFilteredCards });
  },
})); 