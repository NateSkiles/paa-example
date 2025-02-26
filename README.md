# PAA Explorer - People Also Ask Explorer

This tool allows you to gather insights into Google's "People Also Ask" (PAA) SERP feature using SerpApi's Google Search API and Google Related Questions API.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd paa-example

# Install dependencies
pnpm install

# Create a .env file and add your SerpApi key
cp .env.example .env
# Then edit .env with your SerpApi key
```

## Usage

```bash
# Basic search
pnpm start search "how to learn javascript"

# Specify depth (default is 2)
pnpm start search "how to learn javascript" --depth 3

# Output to specific file
pnpm start search "how to learn javascript" --output custom-filename.json
```

## How It Works

1. The tool takes your search query and sends it to the Google Search API via SerpApi
2. It extracts the "People Also Ask" questions from the search results
3. For each question, it recursively fetches additional related questions up to the specified depth
4. The output displays the relationship between questions in a tree structure:
   - 1 → First level question
   - 1.2 → Second question that stems from the first question
   - 2.1.3 → Third question that stems from the first child of the second question

## Output

By default, all search results are saved to the `output` directory using a filename based on the query and current timestamp. You can also specify a custom output path using the `--output` option.

## API Key

You need a SerpApi key to use this tool. Sign up at [SerpApi](https://serpapi.com/) and add your key to the `.env` file.
