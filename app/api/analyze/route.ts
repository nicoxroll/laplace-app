interface FileSize {
  path: string;
  size: string;
}

interface FileChunk {
  files: Array<{ content?: string; path: string; language?: string }>;
  totalFiles: number;
  chunkIndex: number;
}

const MAX_CHUNK_SIZE = 4000; // tokens aproximados por chunk
const CHUNK_OVERLAP = 500; // tokens de superposición entre chunks

function splitFilesIntoChunks(files: Array<{ content?: string; path: string; language?: string }>): FileChunk[] {
  let currentSize = 0;
  let currentChunk: typeof files = [];
  const chunks: FileChunk[] = [];
  
  for (const file of files) {
    if (!file.content) continue;
    
    // Estimación aproximada de tokens (1 token ≈ 4 caracteres)
    const fileTokens = Math.ceil(file.content.length / 4);
    
    if (currentSize + fileTokens > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      // Guardar chunk actual
      chunks.push({
        files: currentChunk,
        totalFiles: files.length,
        chunkIndex: chunks.length
      });
      // Iniciar nuevo chunk con superposición
      currentChunk = [];
      currentSize = 0;
    }
    
    currentChunk.push(file);
    currentSize += fileTokens;
  }
  
  // Agregar el último chunk si existe
  if (currentChunk.length > 0) {
    chunks.push({
      files: currentChunk,
      totalFiles: files.length,
      chunkIndex: chunks.length
    });
  }
  
  return chunks;
}

export async function POST(req: Request) {
  try {
    const reqBody = await req.json();
    const contextObj = reqBody.context || reqBody.repoContext;

    if (!contextObj || !contextObj.repository) {
      return Response.json(
        { error: "Invalid request: Missing repository information" },
        { status: 400 }
      );
    }

    const repository = contextObj.repository.full_name;
    const files = contextObj.files || [];
    const currentFile = contextObj.currentFile;

    if (currentFile && currentFile.content && !files.some((f: { path: string }) => f.path === currentFile.path)) {
      files.push(currentFile);
    }

    // Dividir archivos en chunks procesables
    const fileChunks = splitFilesIntoChunks(files);
    const totalChunks = fileChunks.length;

    // Procesar el chunk actual
    const chunkIndex = reqBody.chunkIndex || 0;
    const currentChunk = fileChunks[chunkIndex];
    
    if (!currentChunk) {
      return Response.json(
        { error: "Invalid chunk index" },
        { status: 400 }
      );
    }

    let contents = "";
    let totalContentSize = 0;
    const sizesLog: FileSize[] = [];

    // Procesar archivos del chunk actual
    currentChunk.files.forEach(
      (file: { content?: string; path: string; language?: string }) => {
        if (!file.content) return;

        const fileSize = file.content.length;
        totalContentSize += fileSize;
        sizesLog.push({
          path: file.path,
          size: `${(fileSize / 1024).toFixed(1)}KB`,
        });

        let processedContent = file.content;
        if (fileSize > 100000) {
          processedContent = file.content.substring(0, 100000) +
            `\n\n// ... content truncated (${(fileSize / 1024).toFixed(1)}KB total) ...\n`;
        }

        contents += `\nFile: ${file.path}\n\`\`\`${file.language || "text"}\n${processedContent}\n\`\`\`\n\n`;
      }
    );

    // Construir el prompt según el índice del chunk
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;

    const systemPrompt = isFirstChunk 
      ? `You are a security expert analyzing code repositories. This is part ${chunkIndex + 1} of ${totalChunks}.
         For each issue found:
         - Show the problematic code snippet
         - Explain the security implications
         - Provide a secure code example as solution
         Use markdown formatting with proper syntax highlighting.`
      : `Continue the security analysis. This is part ${chunkIndex + 1} of ${totalChunks}.
         Focus on new issues found in these files while maintaining consistency with previous findings.`;

    const userPrompt = isFirstChunk
      ? `Begin analyzing the security of ${repository} repository. This is part ${chunkIndex + 1} of ${totalChunks}:

# Security Analysis Report - Part ${chunkIndex + 1}/${totalChunks}

## Security Issues Found
For each issue:
- Show the vulnerable code
- Explain the security risk
- Provide a secure solution

Repository content to analyze (part ${chunkIndex + 1}):
${contents}`
      : `Continue the security analysis for ${repository}. This is part ${chunkIndex + 1} of ${totalChunks}.

Analyze these additional files:
${contents}

Focus on finding new security issues while maintaining consistency with previous findings.`;

    const response = await fetch(
      process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.41:1234/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        signal: AbortSignal.timeout(160000), // Aumentar a 60 segundos
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          model: "deepseek-coder",
          stream: true,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      }
    );

    // Transformar el stream para asegurar que es legible
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const reader = response.body?.getReader();

    if (!reader) {
      return Response.json({ error: "No response stream available" }, { status: 500 });
    }

    // Procesar el stream en background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (error) {
        console.error("Stream processing error:", error);
      } finally {
        await writer.close();
        reader.releaseLock();
      }
    })();

    // Agregar metadatos del chunk a la respuesta
    const responseHeaders = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Total-Chunks": totalChunks.toString(),
      "X-Current-Chunk": chunkIndex.toString(),
      "X-Has-More": (chunkIndex < totalChunks - 1).toString(),
    };

    return new Response(transformStream.readable, { headers: responseHeaders });
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: "Failed to analyze repository" },
      { status: 500 }
    );
  }
}
