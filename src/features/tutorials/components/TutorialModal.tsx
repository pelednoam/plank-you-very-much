"use client";

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import type { Tutorial } from '@/types';
// Import remark and remark-html for markdown processing
// You might need to install these: pnpm add remark remark-html
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorial: Tutorial;
    onComplete: (tutorialId: string) => void; // Callback when tutorial is finished
}

// Simple Markdown renderer (replace with a more robust library like react-markdown if complex features needed)
const renderMarkdown = async (markdown: string): Promise<string> => {
    try {
        const file = await unified()
            .use(remarkParse) // Parse markdown
            .use(remarkHtml) // Convert to HTML
            .process(markdown);
        return String(file);
    } catch (error) {
        console.error("Markdown processing error:", error);
        return `<p>Error rendering content.</p>`; // Fallback
    }
};


export const TutorialModal: React.FC<TutorialModalProps> = ({
    isOpen,
    onClose,
    tutorial,
    onComplete,
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [renderedHtml, setRenderedHtml] = useState<string>('');

    const steps = tutorial.steps.sort((a, b) => a.order - b.order);
    const currentStep = steps[currentStepIndex];
    const totalSteps = steps.length;

    // Render markdown when step changes
    React.useEffect(() => {
        if (currentStep?.markdown) {
            renderMarkdown(currentStep.markdown).then(setRenderedHtml);
        }
    }, [currentStep]);

    const goToNextStep = () => {
        if (currentStepIndex < totalSteps - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // Reached the end
            onComplete(tutorial.id);
            onClose();
        }
    };

    const goToPreviousStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    if (!isOpen || !currentStep) return null;

    // Progress dots
    const progressDots = Array.from({ length: totalSteps }).map((_, index) => (
        <span
            key={index}
            className={`inline-block h-2 w-2 rounded-full mx-1 ${index === currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
        ></span>
    ));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${tutorial.name} (${currentStepIndex + 1}/${totalSteps})`}>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{currentStep.title}</h3>
                {/* Render the processed HTML */} 
                 {/* TODO: Add proper styling for rendered HTML elements (prose class?) */} 
                <div 
                    className="text-sm text-gray-700 prose prose-sm max-w-none" 
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
                {/* TODO: Add image/media display if mediaId exists */}
                
                {/* Navigation */}
                <div className="flex justify-between items-center pt-4 border-t">
                    <div>{progressDots}</div>
                    <div className="space-x-2">
                        <Button 
                            variant="outline" 
                            onClick={goToPreviousStep} 
                            disabled={currentStepIndex === 0}
                        >
                            Back
                        </Button>
                        <Button onClick={goToNextStep}>
                            {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}; 