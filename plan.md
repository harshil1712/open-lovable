Detailed Execution Plan for Migrating to Cloudflare Sandbox SDK
The open-lovable project currently uses an E2B API key for its sandboxes and runs Python code in Docker containers. This migration involves reconfiguring code execution and sandboxing to leverage Cloudflare's edge-native platform.

---

Phase 1: Initial Setup and Replacing E2B Integration

1. Remove E2B Dependency:
   ◦ Locate and remove any code or configuration that relies on E2B_API_KEY. The open-lovable project's .env.local file explicitly lists E2B_API_KEY as a required variable. You will no longer need this variable or any associated logic for sandboxing once you migrate to Cloudflare Sandbox SDK.
2. Install Cloudflare Sandbox SDK:
   ◦ In your open-lovable project directory, run the following npm command to install the SDK:
   ◦ This command adds the @cloudflare/sandbox package to your project's node_modules and updates your package.json, making the SDK's functionalities available.
3. Configure wrangler.json:
   ◦ Create a Dockerfile (Temporary for Local Development): At the root of your project (or a specified path), create a Dockerfile. This Dockerfile should expose the ports you plan to use for any services run within the sandbox locally.
   ◦ Note: This Dockerfile is required with wrangler dev for local development. In production, all container ports are automatically accessible without explicit EXPOSE instructions. Future releases aim to remove this temporary Dockerfile requirement entirely.
   ◦ Update your wrangler.json file to include containers and durable_objects bindings for the Sandbox class.
   ◦ This configuration tells Cloudflare Workers how to instantiate and manage the Sandbox environment, binding it as a Durable Object. The image property points to the Dockerfile for local setup.
4. Integrate Sandbox into your Cloudflare Worker:
   ◦ In your main Worker file (e.g., src/index.ts or worker.js), import getSandbox and export Sandbox from the SDK. Then, obtain a sandbox instance within your fetch handler:
   ◦ getSandbox retrieves an instance of your sandboxed environment, allowing you to interact with it. Exporting the Sandbox class makes it accessible to the Durable Object runtime.

---

Phase 2: Transitioning Code Execution to Cloudflare's Code Interpreter
The open-lovable project currently executes Python code in Docker containers. The Cloudflare Sandbox SDK offers a persistent code interpreter for Python, JavaScript, and TypeScript.

1. Create a Persistent Code Context:
   ◦ Instead of separate Docker containers for each execution, create a persistent context for your Python code using createCodeContext. This allows state to be maintained across multiple runCode calls.
   ◦ You can also specify a working directory (cwd) and environment variables (envVars) for the context.
   ◦ A code context is an isolated environment within the sandbox that maintains its state (like variables, imported modules, and filesystem changes within its cwd) across multiple code executions. This is crucial for complex agent workflows.
2. Execute Code:
   ◦ Use the runCode method to execute your Python code within the created context.
   ◦ For operations with streaming callbacks:
   ◦ runCode sends your code to the interpreter associated with the specified context and returns the execution results. It supports callbacks for real-time output processing.
3. Handle Rich Outputs (for AI Agents performing data analysis):
   ◦ The interpreter automatically formats and returns rich outputs such as text, HTML (e.g., Pandas tables), PNG/SVG (e.g., Matplotlib charts), JSON, and parsed chart information. Adapt your open-lovable logic to consume these formats.
   ◦ For example, if your Python code generates a Matplotlib chart or a Pandas DataFrame:
4. Implement Real-time Streaming for Long-running Tasks:
   ◦ For operations that take time, like complex data analysis or builds, use runCodeStream (or execStream) for real-time output processing. You'll often use parseSSEStream to handle the Server-Sent Events (SSE) stream.
   ◦ Streaming allows your Worker to process output from long-running tasks in real-time, which is beneficial for interactive experiences or monitoring progress of compute-intensive operations without waiting for the entire process to complete.

---

Phase 3: Managing Filesystem Access and Integrating Tools
open-lovable previously noted complications with filesystem access for including specific tools. Cloudflare Sandbox SDK provides comprehensive filesystem management.

1. Read and Write Files:
   ◦ Use writeFile to create files (e.g., scripts, configuration, data) and readFile to read existing files within the sandbox.
2. Clone Git Repositories:
   ◦ If your open-lovable project needs to pull in external tools or code from Git (e.g., a specific version of a library or an internal toolset), use gitCheckout directly within the sandbox.
   ◦ This feature allows your AI agents to dynamically fetch and utilize external codebases, frameworks, or tools directly from Git, eliminating the need for pre-packaging everything.
3. Set Environment Variables:
   ◦ Dynamically set environment variables that your sandboxed code might need. This method setEnvVars() MUST be called immediately after getSandbox() and before any other operations on that sandbox instance.
   ◦ Environment variables are crucial for configuring applications and securely passing credentials or runtime settings to your sandboxed code. The strict placement requirement ensures the variables are available from the very beginning of the sandbox instance's lifecycle.
4. Execute General Commands:
   ◦ For running commands or processes beyond the dedicated code interpreter (e.g., installing dependencies, running build steps, system utilities), use exec.
   ◦ The exec method provides a general-purpose way to run any command-line tool or shell script within the sandbox, mimicking a standard container environment.

---

Phase 4: Implementing Process Control and Network Exposure for Agents
open-lovable mentioned AI agents performing large tasks and issues with context length. Cloudflare Sandbox SDK offers full process lifecycle control and network exposure.

1. Start and Manage Background Processes:
   ◦ For long-running tasks or services that need to persist, use startProcess. You can then inspect, stream logs from, or terminate these processes.
   ◦ The SDK provides methods like listProcesses(), getProcess(id), killProcess(id, signal), killAllProcesses(), streamProcessLogs(id, options), and getProcessLogs(id) for comprehensive process management. This enables maintaining state and running multiple operations.
2. Expose Services with Public URLs:
   ◦ If your AI agent needs to run a service accessible via a public URL (e.g., a local web server or API), use exposePort. This will provide a preview URL.
   ◦ Crucially, your Cloudflare Worker needs to proxy requests to these exposed ports. This is done by integrating proxyToSandbox into your fetch handler:
   ◦ exposePort provides a public URL for services running within your sandbox, making them accessible over the internet. proxyToSandbox in your Worker acts as a router, directing incoming web requests to the correct sandboxed service based on the preview URL, creating a seamless experience.

---

Phase 5: Refinement and Advanced Considerations

1. Debugging and Logging:
   ◦ Enable verbose logging for the sandbox client during development to monitor command execution and output. This is invaluable for debugging your agent's interactions with the sandbox.
   ◦ These callbacks provide real-time insight into the commands being sent to the sandbox and their outputs, helping you understand and troubleshoot your agent's behavior.
2. Session Management:
   ◦ To maintain context (like a shared working directory, environment variables, or running processes) across multiple commands or even multiple Worker invocations, use the sessionId option.
   ◦ Session management is critical for AI agents that perform multi-step operations, ensuring that actions in one step (e.g., cloning a repository) are visible and persistent for subsequent steps (e.g., building or running code within that repository).
3. Understand Limitations:
   ◦ Be aware that the Cloudflare Sandbox SDK's code interpreter specifically has no internet access. This is a security feature that mitigates risks like network worms but means your Python, JavaScript, or TypeScript code executed via runCode or createCodeContext cannot make external network requests.
   ◦ There are also maximum container runtime limits imposed by Durable Object constraints, potential restrictions on some system calls, and resource limits (CPU, memory).
   ◦ WebSocket support for preview URLs is noted as "coming soon."
   ◦ Some Python/JavaScript packages may not be pre-installed. You will need to install them using sandbox.exec("pip install package_name") or sandbox.exec("npm install package_name").

---

By diligently following these detailed steps, you can effectively port the core code execution and sandboxing logic of open-lovable to Cloudflare's edge network, taking advantage of its secure, container-based execution platform designed for AI agents.
