import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        category: z.string(),
        subCategory: z.string().optional(),
        date: z.coerce.date(),
        description: z.string().optional(),
    }),
});

export type category = 'notes' | 'thoughts' | 'essays';
export const collections = { notes: blogCollection, thoughts: blogCollection, essays: blogCollection };
