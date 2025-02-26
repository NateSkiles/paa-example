#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { searchWithDepth } from "./index.js";
import ora from "ora";

const program = new Command();
const OUTPUT_DIR = path.join(process.cwd(), "output");

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
  .action(async (query, options) => {
    const depth = parseInt(options.depth);

    if (isNaN(depth) || depth < 1) {
      console.error(chalk.red("Error: Depth must be a positive number"));
      process.exit(1);
    }

    const spinner = ora(
      `Searching for ${chalk.cyan(query)} with depth ${chalk.cyan(depth)}`
    ).start();

    try {
      const results = await searchWithDepth(query, depth);
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
