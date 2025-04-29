import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Define the structure matching the frontmatter and content
interface KnowledgeCardData {
  id: string;
  title: string;
  tags: string[];
  markdownContent: string;
}

const knowledgeDirectory = path.join(process.cwd(), 'content/knowledge');

/**
 * Loads and parses all knowledge card Markdown files from the data directory.
 * This should typically run at build time or on the server.
 */
export function loadKnowledgeCards(): KnowledgeCardData[] {
    let fileNames: string[] = [];
    try {
        fileNames = fs.readdirSync(knowledgeDirectory);
    } catch (error) {
        console.error('Error reading knowledge directory:', error);
        // Return empty array or throw error depending on desired handling
        return []; 
    }

    const allCardsData = fileNames
        .filter(fileName => fileName.endsWith('.md')) // Ensure we only process markdown files
        .map(fileName => {
            // Remove ".md" from file name to get id
            const id = fileName.replace(/\.md$/, '');

            // Read markdown file as string
            const fullPath = path.join(knowledgeDirectory, fileName);
            let fileContents;
            try {
                 fileContents = fs.readFileSync(fullPath, 'utf8');
            } catch (error) {
                console.error(`Error reading file ${fileName}:`, error);
                return null; // Skip this file if reading fails
            }

            // Use gray-matter to parse the post metadata section
            const matterResult = matter(fileContents);

            // Combine the data with the id and content
            // Basic validation for required frontmatter
            if (!matterResult.data.title || !matterResult.data.tags) {
                 console.warn(`Skipping ${fileName}: Missing title or tags in frontmatter.`);
                 return null;
            }
            
            return {
                id,
                markdownContent: matterResult.content,
                title: matterResult.data.title as string,
                tags: matterResult.data.tags as string[],
            };
        });

    // Filter out any null results from failed reads/parses
    return allCardsData.filter((card): card is KnowledgeCardData => card !== null);
}

// Example of how you might convert markdown to HTML (requires additional libraries)
/*
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';

export async function getKnowledgeCardHtml(id: string): Promise<string | null> {
    const cards = loadKnowledgeCards();
    const card = cards.find(c => c.id === id);
    if (!card) return null;

    const processedContent = await unified()
        .use(remarkParse)
        .use(remarkHtml)
        .process(card.markdownContent);
    return processedContent.toString();
}
*/ 