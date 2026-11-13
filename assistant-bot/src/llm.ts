import { LMStudioClient } from "@lmstudio/sdk";
import config from './../config.json';

export const askLLM = async (images_base64: string[]) => {
    const client = new LMStudioClient();

    // Retrieve the selected model
    try {
        const model = await client.llm.model(config.llm_model);

        // Validate and prepare images in parallel
        const images = await Promise.all(
            images_base64.map((base64, index) => {
                if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
                    throw new Error(`Invalid Base64 string at index ${index}.`);
                }
                return client.files.prepareImageBase64(`image-${index}.jpeg`, base64);
            })
        );

        // Send the prepared images as input to the model
        const result = await model.respond([
            {
                role: "user", content: `Проведи Code Review по приложенным изображеням. Изображения содержат git diff. Код приложения React + Typescript.
  `, images: images
            }
        ]);

        // Return the generated response content
        return result.content;
    } catch (error) {
        console.error("LLM request failed:", error);
        throw error; // Re-throw for caller handling
    }
}