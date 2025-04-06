import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        category: z.string(),
        date: z.coerce.date(),
        description: z.string().optional(),
    }),
});

export type Category = 'notes' | 'thoughts' | 'books';
export const categories: Record<Category, string[]> = {
    notes: ['Operating Systems', 'Distributed Systems', 'Compilers', 'Algorithms', 'Deep Learning'],
    thoughts: [],
    books: []
};

export const collections = { notes: blogCollection, thoughts: blogCollection, books: blogCollection };

