export async function POST(req: Request) {
  try {
    // Extract from request
    const reqBody = await req.json();

    // Log what we received to help with debugging
    console.log("Analyze API received:", {
      hasContext: !!reqBody.context,
      hasRepoContext: !!reqBody.repoContext,
      analysisType: reqBody.analysisType,
      fileCount: (reqBody.context?.files || reqBody.repoContext?.files || [])
        .length,
    });

    // Get the appropriate context object (either context or repoContext)
    const contextObj = reqBody.context || reqBody.repoContext;

    if (!contextObj || !contextObj.repository) {
      console.error("Missing repository information in request");
      return Response.json(
        { error: "Invalid request: Missing repository information" },
        { status: 400 }
      );
    }

    // Extract repository information
    const repository = contextObj.repository.full_name;
    const provider = contextObj.provider || "github";

    // Get all files from the context
    const files = contextObj.files || [];
    const currentFile = contextObj.currentFile;

    // Add current file if it's not already included
    if (
      currentFile &&
      currentFile.content &&
      !files.some((f) => f.path === currentFile.path)
    ) {
      files.push(currentFile);
    }

    console.log(
      `Analyzing repository: ${repository} with ${files.length} files`
    );

    // Prepare the file content for analysis - handle large files better
    let contents = "";

    // Track file sizes for logging
    let totalContentSize = 0;
    const sizesLog = [];

    // Process files with better organization
    files.forEach((file) => {
      // Make sure file has content
      if (!file.content) return;

      // Track file size
      const fileSize = file.content.length;
      totalContentSize += fileSize;
      sizesLog.push({
        path: file.path,
        size: `${(fileSize / 1024).toFixed(1)}KB`,
      });

      // Truncate very large files (over 100KB)
      let processedContent = file.content;
      if (fileSize > 100000) {
        processedContent =
          file.content.substring(0, 100000) +
          `\n\n// ... content truncated (${(fileSize / 1024).toFixed(
            1
          )}KB total) ...\n`;
        console.log(
          `Truncated large file: ${file.path} (${(fileSize / 1024).toFixed(
            1
          )}KB)`
        );
      }

      contents += `\nFile: ${file.path}\n\`\`\`${
        file.language || "text"
      }\n${processedContent}\n\`\`\`\n\n`;
    });

    // Log file size information
    console.log(
      `Total content size: ${(totalContentSize / 1024 / 1024).toFixed(2)}MB`
    );
    console.log(`Processed ${files.length} files for analysis`);

    if (files.length > 10) {
      console.log(
        "Largest files:",
        sizesLog.sort((a, b) => parseInt(b.size) - parseInt(a.size)).slice(0, 5)
      );
    }

    if (!contents.trim()) {
      console.warn("No file contents provided for analysis");
      contents = "No file contents available for analysis.";
    }

    // Continue with the API call
    const response = await fetch(
      process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:1234/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a security expert analyzing code repositories.
              For each issue or recommendation:
              - Show the problematic code snippet
              - Explain the security implications
              - Provide a secure code example as solution
              Use markdown formatting with proper syntax highlighting.`,
            },
            {
              role: "user",
              content: `Analyze the security of ${repository} repository using this structure:

# Security Analysis Report

## 1. Security Vulnerabilities
For each vulnerability found:
- Show the vulnerable code snippet
- Explain the security risk
- Provide a secure code example

## 2. Code Quality Issues
For each quality issue:
- Show the problematic code
- Explain why it's a security concern
- Provide an improved code example

## 3. Best Practices
For each recommendation:
- Show current code that could be improved
- Explain the best practice
- Provide example implementation

## 4. Security Improvements
For each suggestion:
- Show relevant code sections
- Explain the improvement
- Provide secure code examples

Repository content to analyze:
${contents}`,
            },
          ],
          model: "deepseek-coder",
          stream: true,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      }
    );

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      { error: "Failed to analyze repository" },
      { status: 500 }
    );
  }
}
