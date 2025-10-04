import { corsHeaders } from '../_shared/cors.ts'

console.log("Analyze document function initialized.");

// Get the OpenAI API key from the environment variables (secrets)
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentText } = await req.json();
    if (!documentText || typeof documentText !== 'string' || documentText.length < 50) {
      throw new Error("A substantial amount of text is required for analysis.");
    }

    const prompt = `
      Analyze the following text from an academic document for potential bias.
      Based *only* on the text provided, return a JSON object with the following structure and nothing else:
      {
        "geographic_focus": "Based on locations and affiliations, determine the primary geographic focus (e.g., 'US-centric', 'Euro-centric', 'Global South', 'East Asian', 'Balanced').",
        "gender_representation": "Based on author names and pronouns, estimate the gender representation (e.g., 'Predominantly Male', 'Predominantly Female', 'Balanced', 'Unknown').",
        "summary": "A brief, neutral, one-sentence summary of the document's main topic.",
        "confidence_score": "A score from 0 to 1 on how confident you are in this analysis given the limited text."
      }

      Text to analyze:
      ---
      ${documentText.slice(0, 15000)} 
      ---
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenAI API error: ${errorBody.error.message}`);
    }

    const aiResponse = await response.json();
    const analysisResult = JSON.parse(aiResponse.choices[0].message.content);

    return new Response(
      JSON.stringify({ analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});