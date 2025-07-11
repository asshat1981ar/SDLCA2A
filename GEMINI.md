# Project Overview

This project is an autonomous software development life cycle (SDLC) agent. It appears to be a web-based application that uses AI to assist with various development tasks, from ideation and planning to coding, testing, and deployment. The application is built with React and TypeScript and utilizes the Gemini API for its AI capabilities.

# Getting Started

**Prerequisites:**

*   Node.js
*   Gemini API Key

**Installation and Setup:**

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Set the `GEMINI_API_KEY` environment variable. You can do this by creating a `.env.local` file in the root of the project and adding the following line:
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

# Project Structure

*   `App.tsx`: The main application component that manages the overall layout and state.
*   `components/`: Contains reusable React components for different parts of the UI, such as the input form, plan view, code editor, and chat.
*   `constants.tsx`: Defines application-wide constants, such as the title and icons.
*   `hooks/`: Houses custom React hooks, like `useProjectOrchestrator.ts`, which likely contains the core business logic.
*   `reducer.ts`: Manages the application's state using a React reducer.
*   `services/`: Includes modules for interacting with external APIs (Gemini, GitHub) and managing application state.
*   `utils/`: Provides utility functions for tasks like file tree manipulation and generating UUIDs.
*   `vite.config.ts`: The configuration file for the Vite development server and build tool.

# Technologies and Libraries

*   **Frontend:** React, TypeScript
*   **Build Tool:** Vite
*   **Styling:** (Likely) Tailwind CSS, based on the class names in `App.tsx`.
*   **AI:** Google Gemini API (`@google/genai`)
*   **Version Control:** Git, with integration for GitHub (`github-api`).
*   **Testing:** Vitest, React Testing Library
*   **Linting and Formatting:** ESLint, Prettier

# Available Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Previews the production build locally.
*   `npm run lint`: Lints the codebase for errors.
*   `npm run lint:fix`: Automatically fixes linting errors.
*   `npm run format`: Formats the code using Prettier.
*   `npm run test`: Runs the test suite.
*   `npm run test:ui`: Runs the tests with the Vitest UI.
*   `npm run typecheck`: Checks for TypeScript errors.
