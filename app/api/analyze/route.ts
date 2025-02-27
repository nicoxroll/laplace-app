export async function POST(req: Request) {
  try {
    // Extract from request - handle both formats that might be sent
    const reqBody = await req.json();
    
    // Log what we received to help with debugging
    console.log("Analyze API received:", {
      hasContext: !!reqBody.context,
      hasRepoContext: !!reqBody.repoContext,
      analysisType: reqBody.analysisType
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
    
    // Extract file contents - combine all files into a single content structure
    const files = contextObj.files || [];
    const currentFile = contextObj.currentFile;
    
    // Add current file to the files array if it exists and isn't already included
    if (currentFile && currentFile.content && !files.some(f => f.path === currentFile.path)) {
      files.push(currentFile);
    }
    
    // Format contents as a string representation of file paths and contents
    const contents = files.map(file => 
      `File: ${file.path}\n\`\`\`${file.language || 'text'}\n${file.content || ''}\n\`\`\`\n`
    ).join("\n");
    
    console.log(`Analyzing repository: ${repository} with ${files.length} files`);
    
    if (!contents.trim()) {
      console.warn("No file contents provided for analysis");
    }

    const response = await fetch(
      process.env.API_URL || "http://localhost:1234/v1/chat/completions",
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
          max_tokens: 2000,
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
