import type { Message } from "@/types/chat";
import type { RepositoryContext } from "@/types/repository";

export class ChatService {
  private static instance: ChatService;

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  formatRepoContext(context: RepositoryContext): string {
    const sections = [
      `# Repository Analysis Context`,
      `Provider: ${context.provider}`,
      `Repository: ${context.repository.full_name}`,
      `Current Path: ${context.currentPath}`,
    ];

    if (context.currentFile) {
      sections.push(
        `\n## Current File: ${context.currentFile.path}`,
        "```" + (context.currentFile.language || "plaintext"),
        context.currentFile.content.join("\n"),
        "```"
      );
    }

    return sections.join("\n");
  }

  async streamResponse(
    apiUrl: string,
    messages: Message[],
    context: RepositoryContext,
    signal: AbortSignal,
    onChunk: (content: string) => void
  ): Promise<void> {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) throw new Error("Failed to get response");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream available");

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              onChunk(data.choices[0].delta.content);
            }
          } catch (err) {
            console.error("Error parsing chunk:", err);
          }
        }
      }
    }
  }

  async handleSubmit(
    input: string,
    repoContext: string,
    signal: AbortSignal,
    onStart: () => void,
    onUpdate: (content: string) => void
  ): Promise<void> {
    try {
      onStart(); // Llamamos esto antes de hacer el fetch

      const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-qwen-7b",
          messages: [
            {
              role: "system",
              content: repoContext,
            },
            {
              role: "user",
              content: input,
            },
          ],
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  accumulatedContent += data.choices[0].delta.content;
                  onUpdate(accumulatedContent);
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
