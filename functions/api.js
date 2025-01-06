export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/habits')) {
      const date = url.searchParams.get('date');
      if (date) {
        const data = await env.HABIT_DATA.get(`habits:${date}`);
        return new Response(data || '{}', {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Bad Request', { status: 400 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
  