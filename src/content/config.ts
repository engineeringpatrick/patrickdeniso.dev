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
export const collections = { notes: blogCollection, thoughts: blogCollection, books: blogCollection };
