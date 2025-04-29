"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm';

// Define the structure matching the data loaded on the server
// Note: Ensure this matches the return type of loadKnowledgeCards
interface KnowledgeCardData {
  id: string;
  title: string;
  tags: string[];
  markdownContent: string;
}

// --- Knowledge Card Component (Internal to Client Page) ---
interface KnowledgeCardProps {
    card: KnowledgeCardData;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ card }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {card.markdownContent}
                    </ReactMarkdown>
                </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-1 pt-4">
                 {card.tags.map(tag => (
                     <Badge key={tag} variant="secondary">{tag}</Badge>
                 ))}
            </CardFooter>
        </Card>
    );
};
// --- End Knowledge Card Component ---

// --- Client Page Component ---
interface KnowledgeClientPageProps {
    initialCards: KnowledgeCardData[];
}

const KnowledgeClientPage: React.FC<KnowledgeClientPageProps> = ({ initialCards }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCards = useMemo(() => {
        if (!searchTerm) return initialCards;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return initialCards.filter(card => 
            card.title.toLowerCase().includes(lowerCaseSearch) ||
            card.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearch)) ||
            card.markdownContent.toLowerCase().includes(lowerCaseSearch) // Also search content
        );
    }, [initialCards, searchTerm]);

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h1 className="text-2xl font-semibold">Knowledge Base</h1>
                 <Input 
                    type="search"
                    placeholder="Search tips..." 
                    className="max-w-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {initialCards.length === 0 ? (
                <p className="text-center text-muted-foreground">No knowledge cards found.</p>
            ) : filteredCards.length === 0 ? (
                <p className="text-center text-muted-foreground">No tips found matching your search.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCards.map(card => (
                        <KnowledgeCard key={card.id} card={card} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default KnowledgeClientPage; 