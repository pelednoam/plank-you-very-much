// src/app/knowledge/page.tsx - Server Component
import React from 'react';
import { loadKnowledgeCards } from '@/lib/knowledgeUtils';
import KnowledgeClientPage from '@/features/knowledge/components/KnowledgeClientPage';

export default function KnowledgePage() {
    // Load data on the server during rendering
    const allCards = loadKnowledgeCards();

    // Pass the server-loaded data to the client component for interaction
    return <KnowledgeClientPage initialCards={allCards} />;
} 