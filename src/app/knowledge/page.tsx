import React from 'react';

// TODO: Define KnowledgeCard data structure and load actual data
interface KnowledgeCardData {
    id: string;
    title: string;
    content: string; // Simple text content for now
    tags?: string[];
    // Add image/media links later
}

// Placeholder data
const placeholderCards: KnowledgeCardData[] = [
    {
        id: 'back-safe-plank',
        title: 'Back-Safe Plank Form',
        content: 'Maintain a straight line from head to heels. Engage your core and glutes. Avoid letting your hips sag or rise too high. Keep your neck neutral.',
        tags: ['core', 'back-safe', 'form']
    },
    {
        id: 'hydration-importance',
        title: 'Why Hydration Matters',
        content: 'Staying hydrated is crucial for performance, recovery, and overall health. Aim for consistent water intake throughout the day, especially around workouts.',
        tags: ['nutrition', 'performance']
    },
    {
        id: 'lactose-free-protein',
        title: 'Lactose-Free Protein Sources',
        content: 'Good options include plant-based proteins (pea, soy, rice), egg white protein, or lactose-free whey isolates. Check labels carefully.',
        tags: ['nutrition', 'lactose-free']
    }
];

const KnowledgeCard: React.FC<{ card: KnowledgeCardData }> = ({ card }) => {
    return (
        <div className="p-4 border rounded shadow bg-white space-y-2">
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="text-gray-700 text-sm">{card.content}</p>
            {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                    {card.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function KnowledgePage() {
    const cards = placeholderCards; // Use placeholder data for now

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-gray-600">Short tips and guides on form, nutrition, and more.</p>

            {/* TODO: Add filtering/search functionality */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(card => (
                    <KnowledgeCard key={card.id} card={card} />
                ))}
            </div>
        </div>
    );
} 