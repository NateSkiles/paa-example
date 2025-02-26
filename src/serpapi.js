import dotenv from "dotenv";
import { getJson } from "serpapi";

dotenv.config();

const apiKey = process.env.SERPAPI_KEY;

if (!apiKey) {
  console.error("Error: SERPAPI_KEY not found in environment variables");
  console.error("Create a .env file with SERPAPI_KEY=your_api_key_here");
  process.exit(1);
}

/**
 * Perform a Google search using SerpApi
 * @param {string} query The search query
 * @returns {Promise<Object>} The search results
 */
export async function googleSearch(query) {
  const params = {
    q: query,
    api_key: apiKey,
  };

  try {
    return await getJson("google", params);
  } catch (error) {
    console.error("Error performing Google search:", error);
    throw error;
  }
}

/**
 * Fetch related questions using the Google Related Questions API
 * @param {string} pageToken The page token from a question
 * @returns {Promise<Object>} Related questions
 */
export async function fetchRelatedQuestions(pageToken) {
  const params = {
    next_page_token: pageToken,
    api_key: apiKey,
  };

  try {
    return await getJson("google_related_questions", params);
  } catch (error) {
    console.error("Error fetching related questions:", error);
    throw error;
  }
}
