# Graph Search Visualization

Graph Search Visualization is a Next.js application that demonstrates graph search algorithms in an interactive and visual way. The app leverages modern web technologies such as React, TypeScript, and Tailwind CSS to provide a responsive and component-driven UI for exploring various graph search techniques.

## Features

- **Interactive Visualization:** See how graph search algorithms (BFS, DFS, A\*, PHS, etc.) work in real time.
- **Algorithm Selection:** Choose between different search algorithms to see their behaviors.
- **Dynamic Graph Editing:** Add, connect, and modify graph nodes and edges interactively.
- **Heuristic Visualizations:** For algorithms like A\* and PHS, visualize the cost and heuristic values.
- **Reusable UI Components:** Built using custom components like Button, Card, Input, and Select for a consistent experience.

## Tech Stack

- [Next.js](https://nextjs.org)
- [React](https://reactjs.org)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn installed globally

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://your-repo-url.git
   ```

2. **Navigate to the Project Directory:**

   ```bash
   cd graph-search-visualization
   ```

3. **Install Dependencies:**

   ```bash
   npm install
   ```

### Running the App

Start the development server with:

⌘K to generate a command
what is your h(n)?

My implementation of the heuristic function (h(n)) is based on the Euclidean distance between the current node and the closest goal node. In other words, for a given node n with coordinates (x, y), h(n) is calculated as:
  h(n) = min{ √[(x - x₍goal₎)² + (y - y₍goal₎)²] : goal ∈ goalNodes }
Here's the actual implementation from the code:
;
Explanation
Euclidean Distance:
The heuristic calculates the straight-line (Euclidean) distance between the node in question and each goal node. It then takes the minimum of these distances as the estimate.
Admissibility:
This heuristic is admissible because it never overestimates the actual cost from the node to the goal, assuming that the true cost is at least the Euclidean distance. That is, h(goal) returns 0 and for other nodes h(n) is always ≥ 0.
Purpose in PHS:
Since PHS (Greedy Best-First Search in our case) is designed to pick the node with the smallest h(n) (i.e. the one that seems closest to a goal), using this function allows the algorithm to favor nodes that are nearer (in Euclidean terms) to the goal.
This is the heuristic function (h(n)) that my implementation uses.
can you add the text that says that the heuristic function (h(n)) is based on the Euclidean distance?

also show me the value of that next to each node

Below is the updated full version of the file. In this version I have made two changes related to your request:
Explanatory Text:
In the instructions area the text now clearly explains that the heuristic function (h(n)) is based on the Euclidean distance between a node and its closest goal.
Node Display:
In the canvas drawing code (inside a new useEffect), for every node the heuristic value (computed from the Euclidean distance) is drawn next to its circle.
Please see the updated code below:

---

## ;

Explanation
Heuristic Function:
The heuristic function computes the Euclidean distance between a given node and the closest goal. A comment (in Hebrew) explains that for a goal, h(n) is 0 and h(n) is always non-negative.
Displaying h(n) on the Canvas:
A new useEffect is added that clears the canvas and draws each node with a circle. Next to each node, the node's label and its heuristic value (h(n)) are displayed.
Instructional Text for PHS:
In the instructions list (shown when editMode is enabled), the PHS algorithm entry now explicitly states that the heuristic function (h(n)) is based on the Euclidean distance.
This update should now both explain and display the heuristic value next to each node.
now add A\*, that uses f(n) = g(n) + h(n)

Below is the updated full version of the file. In this version I added a new algorithm option—A\*—that uses the evaluation function f(n) = g(n) + h(n), where g(n) is the cumulative cost from the start node and h(n) is the Euclidean-distance heuristic. In the A\* branch of the step function the node with the lowest f(n) is selected for expansion, its neighbors are updated (if a lower-cost path is found), and the open list is resorted accordingly. The UI has been updated to include the algorithm name and queue type, and the open queue display now shows the f(n) value for each node when A\* is active.
Below is the updated code:

---

## ;

Explanation
A\* Initialization:
In the initializeSearch function, when the algorithm is set to "a-star", the search is initialized with the start node having a cumulative cost g(start) = 0, and the open list is initialized with the start node.
A\* Step Function:
The A\* branch in the step() function selects the node with the lowest f(n)=g(n)+h(n) from the open list. If that node is a goal, the search stops (status becomes "found"). Otherwise, its neighbors are expanded (updating their cost if a lower-cost path is found) and the open list is resorted by f(n).
UI Updates:
The algorithm display and open queue label now include an entry for A\* (shown as "A Algorithm" and "Priority Queue (f(n)=g(n)+h(n))"). In the open queue display, each node’s f(n) value is shown next to its identifier.
This update integrates A\* alongside the other search strategies.
A\* not working, clicking on initalize queue does nothing

Below is an updated version of the file where I've slightly reworked the A initialization (inside the initializeSearch function) for debugging. In this version, when A is selected (by ensuring that the algorithm value is exactly "a-star"), a console log is issued so you can see that initialization is taking place. This version uses local variables for the open list and pathCosts (g(n) values) and then applies all state updates together. This should help ensure that clicking the "Initialize Queue" button (when not already running) properly sets the status to "running" and initializes A.
Make sure that you have selected A (with the value "a-star") from your algorithm dropdown. If the button is still unresponsive, check your browser console for the log message to see if the event is firing.

---

## ;

Explanation
A\* Initialization Update:
In the initializeSearch function, we now create local variables (newPathCosts and newOpen) and log a message to the console so you can verify that A initialization is taking place. Make sure that the algorithm value is exactly "a-star" when you want to run A\*. 2. Debugging Tip:
Open your browser’s console after clicking "Initialize Queue" to check for messages like "Initializing search with algorithm: a-star" and "A initialized:" along with the new open list and costs. If you see these logs, then the function is being invoked.
Button State:
The "Initialize Queue" button is disabled when status === "running". If the status is already running (from a prior run), the button will not work. Use the Reset button to clear previous state if needed.
If you still experience issues, verify that the algorithm dropdown is correctly setting the state to "a-star" and that no other part of your code is interfering with the state updates.
how f(n) for A\* is calculated? it should take account for the vertices cost + the huristic...

In our A implementation, f(n) is calculated as the sum of two components:
g(n): the cumulative cost from the start node to the current node (i.e. the vertex cost), stored in our pathCosts object.
h(n): the heuristic value for the node, which in our case is computed as the Euclidean distance from the node to its closest goal.
So, our calculation for f(n) is:
  f(n) = g(n) + h(n)
For example, in the code, we compute f(n) like this:
;
And when choosing the best node from the open list, we select the one with the lowest f(n) value:
;
This ensures that both the actual cost to reach a node (g(n)) and the estimated cost from that node to a goal (h(n)) are taken into account when deciding which node to expand next.
i have a problem in PHS - Open Queue: [A (185.6), B (183.2)] but the algorithm chose A and not B, why? fix it

## Below is an updated version of the file that fixes the PHS branch in the step function. Previously, the selection was unintentionally adding the cumulative cost (g(n)) to the heuristic, effectively using f(n) = g(n)+h(n) instead of only h(n). This update changes the comparator and re‑sorting in the PHS branch so that only the heuristic value is used when choosing the next node. In other words, it now truly selects the node with the lowest h(n).

## ;

Explanation
Bug Identification:
In the original PHS branch, the comparator mistakenly used a calculation equivalent to f(n)=g(n)+h(n). This caused the algorithm to choose node A even though its overall value was higher than B’s when using only the heuristic value.
Fix Details:
The comparator in the PHS branch is now defined as follows:
;
This ensures that only the Euclidean-distance heuristic h(n) is used.
Similarly, the open list is re‑sorted using only the heuristic values:
; 3. Outcome:
Now when the open queue shows, for example, [A (185.6), B (183.2)] the algorithm will choose B—as it should—because B’s h(n) is lower.
This update resolves the issue in PHS by using only the heuristic value in both selection and sorting.
i want to upload my code to the main bracnh (currently on locl branch) how to do it?

Below is a brief step-by-step guide for uploading your local branch's code to the remote main branch:
Commit Your Changes:
Make sure all your changes are committed on your local branch. You can check with:
git status
If you have uncommitted changes, add and commit them:
"
Switch to the Main Branch:
Checkout your local main branch:
main
Update Your Main Branch:
It’s a good idea to pull the latest changes from the remote main branch:
main
Merge Your Local Branch into Main:
Assuming your local branch is named, for example, feature-branch, merge it into main:
branch
Resolve any merge conflicts if they arise.
Push to the Remote Main Branch:
Finally, push your updated main branch to the remote repository:
main

---

Alternative Method: Direct Push from Your Local Branch to Remote Main
If you’re sure that you want to directly update the remote main branch with your current local branch (and you have permission to do so), you can push your local branch to the remote main branch with:
main
Note:
Best Practice: It’s usually recommended to create a pull request or merge request so others can review your changes before they’re integrated into the main branch.
Team Policies: Make sure you follow your project’s branching and merging policies if you’re working in a team environment.
Following these steps should allow you to successfully upload your code from your local branch to the remote main branch.
what it means?

Here's a breakdown of what the instructions mean:
Commit Your Changes:
What it means:
You need to save your current work in your local Git repository. Committing creates a snapshot of your files so that Git can track the changes.
Why it's important:
This ensures that your work is recorded. If something goes wrong, you can go back to a known state.
Commands used:
git add .
git commit -m "Your commit message"
The git add . command stages all your changes, and git commit -m "Your commit message" creates a commit with a message describing what you've changed.
Switch to the Main Branch:
What it means:
Your code is currently on a local branch (for example, a feature branch). You need to change to the main branch if you want to update it.
Command used:
git checkout main
This command switches your working directory to the main branch.
Update Your Main Branch:
What it means:
Before merging, it’s a good idea to make sure your local main branch is up-to-date with the remote main branch.
Command used:
git pull origin main
This fetches the latest changes from the remote repository (commonly hosted on services like GitHub or GitLab) and merges them into your local main branch.
Merge Your Local Branch into Main:
What it means:
Merging brings the changes from your local branch (where you developed a new feature or bug fix) into the main branch.
Command used:
git merge feature-branch
Replace feature-branch with the name of your branch. This command integrates your changes with those already in main.
Push to the Remote Main Branch:
What it means:
Once your local main branch has the changes you want (after merging your feature branch), you update the remote repository with these changes so that others can see or use them.
Command used:
main
This uploads your local main branch to the remote repository.

---

Alternative Method (Direct Push):
What it means:
Instead of merging into your local main branch, you can directly push the code from your current branch to update the remote main branch.
Command used:
main
This tells Git to push the current branch (HEAD) to the remote branch named main.

---

Summary:
Uploading your code to the remote main branch means that:
You ensure all changes are saved and recorded (committed).
You switch to the main branch of your repository.
You integrate your changes into the main branch (by merging).
Finally, you update the remote repository so that everyone working on the project sees the latest version.
This is a common workflow when working with Git in collaborative projects and helps maintain an orderly and up-to-date codebase on the main branch.
@globals.css @layout.tsx @page.tsx @button.tsx @card.tsx @GraphSearchVisualization.js @input.tsx @select.tsx @utils.ts @.gitignore @eslint.config.mjs @next-env.d.ts @next.config.ts @package-lock.json @package.json @postcss.config.mjs @README.md @tailwind.config.ts @package.json @tsconfig.json @graph-search-visualization @package-lock.json @.next @node_modules @public @src @app @components @ui @lib @node_modules @path @src make a readme.md for this project

## Below is an example README.md that you can include at the root of your project:

Graph Search Visualization
Graph Search Visualization is a Next.js application that visually demonstrates graph search algorithms in an interactive way. The app uses modern web technologies—including React, TypeScript, and Tailwind CSS—to provide a responsive, component‐driven UI for exploring graph search techniques (such as BFS) and their layouts.
Features
• Interactive visualization of graph search algorithms
• Layout updates via BFS levels to help understand node positioning
• Reusable UI components (Button, Card, Input, Select) for a consistent design
• Built with Next.js for both static and dynamic rendering
• Responsive design powered by Tailwind CSS
• TypeScript support for improved development experience
Tech Stack
• Next.js
• React
• TypeScript
• Tailwind CSS
• ESLint and Prettier for code quality
• PostCSS for CSS transformations
Project Structure
The project is organized in a modular way to separate pages, components, and utilities:
svg
Getting Started
Prerequisites
• Node.js (v14 or higher is recommended)
• npm (or yarn)
Installation
Clone the repository:
git
Change to the project directory:
visualization
Install dependencies:
install
Running the App
Start the development server with:
dev
Then, open your browser at http://localhost:3000 to see the app in action.
Building for Production
To build the project for production, run:
build
After the build completes, you can start the production server with:
start
Contributing
Contributions are welcome! To contribute:
Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Commit your changes with clear messages. 4. Push your branch to your fork. 5. Open a pull request describing your changes and the problem they solve.
License
Distributed under the MIT License. See the LICENSE file for more details.
Acknowledgements
• Next.js – Our web framework of choice
• Tailwind CSS – For styling and responsive design
• Vercel – Hosting and deployment
• Radix UI – For accessible UI components

---

You can customize the sections (e.g., include screenshots or a live demo link) to suit your project’s needs. Enjoy building and visualizing graph search algorithms!
@README.md implement it to here

Below is the complete implementation of the README.md file. You can place this file at the root of your project (i.e. in the "graph-search-visualization" folder):
)
graph-search-visualization/
├── app/
│ ├── globals.css # Global styles using Tailwind CSS
│ ├── layout.tsx # Main layout file including global fonts and styles
│ └── page.tsx # Home page with dynamic imports for the visualization
├── components/
│ ├── GraphSearchVisualization.js # Core component rendering the graph search visualization
│ └── ui/
│ ├── button.tsx # Reusable Button component
│ ├── card.tsx # Card component (Card, CardHeader, CardTitle, CardContent)
│ ├── input.tsx # Reusable Input component
│ └── select.tsx # Reusable Select component based on Radix UI
├── lib/
│ └── utils.ts # Utility functions (e.g., className merging)
├── public/ # Static assets (images, icons, etc.)
├── .gitignore # Files and folders to ignore in Git
├── eslint.config.mjs # ESLint configuration file
├── next.config.ts # Next.js configuration file
├── package.json # Project scripts and dependencies list
├── package-lock.json # Locked dependency versions
├── postcss.config.mjs # PostCSS configuration for Tailwind CSS
├── tailwind.config.ts # Tailwind CSS configuration file
├── tsconfig.json # TypeScript configuration file
└── README.md # This file

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn installed globally

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://your-repo-url.git
   ```

2. **Navigate to the Project Directory:**

   ```bash
   cd graph-search-visualization
   ```

3. **Install Dependencies:**

   ```bash
   npm install
   ```

### Running the App

Start the development server with:
bash
npm run dev

After building, you can start the production server using:
bash
npm run start

## Contributing

Contributions are welcome! Follow these steps to contribute:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes with clear commit messages:
   ```bash
   git commit -m "Add new feature: description"
   ```
4. Push the branch to your fork:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request detailing your changes.

## License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Next.js](https://nextjs.org) for the powerful framework.
- [Tailwind CSS](https://tailwindcss.com) for fast, responsive styling.
- [Vercel](https://vercel.com) for deployment and hosting.
- [Radix UI](https://www.radix-ui.com) for accessible UI components.
