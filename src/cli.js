#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { searchWithDepth } from "./index.js";
import ora from "ora";
import readline from "readline";

const program = new Command();
const OUTPUT_DIR = path.join(process.cwd(), "output");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt for confirmation
function promptForConfirmation(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Estimate search credits required based on depth
function estimateSearchCredits(depth) {
  // For depth 1: Initial search only (1 credit)
  if (depth === 1) return 1;

  // For deeper searches: Initial search + subsequent levels
  // Average number of questions per search is ~3
  // Level 1: 1 search
  // Level 2: ~3 searches (1 per question from level 1)
  // Level 3: ~9 searches (3 per question from level 2)
  let totalCredits = 1; // Initial search
  let questionsAtLevel = 3; // Assuming average of 3 questions initially

  for (let i = 2; i <= depth; i++) {
    totalCredits += questionsAtLevel;
    questionsAtLevel *= 3; // Each question spawns ~3 more questions
  }

  return totalCredits;
}

// Ensure output directory exists
async function ensureOutputDirExists() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error(`Failed to create output directory: ${error.message}`);
    }
  }
}

// Generate filename with current datetime
function generateDateTimeFilename(query) {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split("Z")[0];

  // Sanitize query for filename
  const sanitizedQuery = query
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 30);

  return path.join(OUTPUT_DIR, `${sanitizedQuery}_${timestamp}.json`);
}

program
  .name("paa")
  .description(
    "People Also Ask Explorer - Gather insights into PAA SERP features"
  )
  .version("1.0.0");

program
  .command("search")
  .description("Search for a query and explore PAA questions")
  .argument("<query>", "The search query")
  .option("-d, --depth <number>", "Depth of related questions to fetch", "2")
  .option("-o, --output <file>", "Output results to JSON file")
  .option("-y, --yes", "Skip confirmation and proceed with search")
  .option("--no-cache", "Force new searches by setting no_cache=true parameter")
  .action(async (query, options) => {
    const depth = parseInt(options.depth);

    if (isNaN(depth) || depth < 1) {
      console.error(chalk.red("Error: Depth must be a positive number"));
      process.exit(1);
    }

    // Only show credit estimation if not using --yes flag
    if (!options.yes) {
      const estimatedCredits = estimateSearchCredits(depth);

      console.log(chalk.cyan("\nSearch Credit Estimation:"));
      console.log(`Initial search: ${chalk.yellow("1 credit")}`);
      console.log(
        `Estimated total: ${chalk.yellow(`~${estimatedCredits} credits`)}`
      );

      if (!options.cache) {
        console.log(
          chalk.yellow(
            "\nWarning: --no-cache option enabled. This will force new searches and may use more credits."
          )
        );
      }

      console.log(
        chalk.gray(
          "\nNote: Cached searches don't consume credits. The actual number of credits used"
        )
      );
      console.log(
        chalk.gray(
          "depends on how many questions Google returns for each search. This is just an"
        )
      );
      console.log(chalk.gray("estimation based on average response sizes.\n"));

      const confirmed = await promptForConfirmation(
        `Do you want to proceed with searching "${query}" at depth ${depth}?`
      );

      if (!confirmed) {
        console.log(chalk.yellow("Search cancelled."));
        rl.close();
        process.exit(0);
      }
    }

    const spinner = ora(
      `Searching for ${chalk.cyan(query)} with depth ${chalk.cyan(depth)}${
        !options.cache ? chalk.yellow(" (no cache)") : ""
      }`
    ).start();

    try {
      const results = await searchWithDepth(query, depth, !options.cache);
      spinner.succeed(
        `Found ${countQuestions(results.questions)} related questions`
      );

      console.log("\nResults:");
      displayResults(results);

      await ensureOutputDirExists();
      const outputPath = options.output || generateDateTimeFilename(query);

      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      console.log(chalk.green(`\nResults saved to: ${outputPath}`));
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  });

function countQuestions(questions) {
  return questions.reduce((count, q) => {
    return count + 1 + (q.children ? countQuestions(q.children) : 0);
  }, 0);
}

function displayResults(results) {
  console.log(chalk.bold(`\nInitial Query: ${results.query}`));

  results.questions.forEach((question, index) => {
    displayQuestion(question, index, 0, []);
  });
}

function displayQuestion(question, index, level, path) {
  const indent = "  ".repeat(level);
  const prefix = level === 0 ? "└─ " : "├─ ";
  const currentPath = [...path, index + 1];
  const pathString = currentPath.join(".");

  console.log(
    `${indent}${prefix}${chalk.yellow(pathString)} ${question.question}`
  );

  if (question.children && question.children.length > 0) {
    question.children.forEach((child, childIndex) => {
      displayQuestion(child, childIndex, level + 1, currentPath);
    });
  }
}

program.parse();
