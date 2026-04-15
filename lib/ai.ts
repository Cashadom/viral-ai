import OpenAI from "openai";

export async function generateContent(niche: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
Donne 5 idées de vidéos TikTok virales pour la niche : ${niche}

Format :
- Hook
- Idée
- Call to action
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}