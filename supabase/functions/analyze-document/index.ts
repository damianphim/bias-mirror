import { OpenAI } from 'npm:openai';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize OpenAI client
const openAI = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

console.log("Analyze document function initialized.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { documentText } = await req.json();

    const completion = await openAI.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert geopolitical analyst. Analyze the following document to identify its primary geographic focus. Your response must be a JSON object with a single key: 'geographic_focus'.",
        },
        {
          role: "user",
          content: documentText,
        },
      ],
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});