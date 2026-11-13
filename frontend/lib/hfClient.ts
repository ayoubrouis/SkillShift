import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN!);

export async function hfGenerate(prompt: string): Promise<string> {
  const result = await hf.textGeneration({
    model: 'gpt2',
    inputs: prompt,
    parameters: { temperature: 0.1, max_new_tokens: 256 },
  });
  return (result as any).generated_text?.trim() ?? '';
}
