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

export type Category = 'notes' | 'thoughts' | 'essays';
export const collections = { notes: blogCollection, thoughts: blogCollection, essays: blogCollection };
