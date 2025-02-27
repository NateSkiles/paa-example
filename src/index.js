import { googleSearch, fetchRelatedQuestions } from "./serpapi.js";

/**
 * Build a tree of PAA questions up to the specified depth
 * @param {string} query The initial search query
 * @param {number} maxDepth The depth to explore
 * @param {boolean} noCache Whether to force new searches (no cache)
 * @returns {Promise<Object>} The question tree
 */
export async function searchWithDepth(query, maxDepth = 2, noCache = false) {
  // Initial search
  const initialResults = await googleSearch(query, noCache);

  // Check if there are related questions
  if (
    !initialResults.related_questions ||
    initialResults.related_questions.length === 0
  ) {
    return {
      query,
      questions: [],
    };
  }

  // Process the initial questions
  const questions = initialResults.related_questions;

  // Build the question tree
  return {
    query,
    questions: await buildQuestionTree(questions, maxDepth, 1, noCache),
  };
}

/**
 * Recursively build a tree of related questions
 * @param {Array} questions Array of question objects
 * @param {number} maxDepth Maximum depth to explore
 * @param {number} currentDepth Current depth level
 * @param {boolean} noCache Whether to force new searches (no cache)
 * @returns {Promise<Array>} Array of questions with their children
 */
async function buildQuestionTree(
  questions,
  maxDepth,
  currentDepth,
  noCache = false
) {
  if (currentDepth >= maxDepth) {
    return questions.map((q) => ({
      ...cleanQuestionData(q),
      depth: currentDepth,
      children: [],
    }));
  }

  const results = [];

  for (const question of questions) {
    // If there's no page token, we can't fetch more related questions
    if (!question.next_page_token) {
      results.push({
        ...cleanQuestionData(question),
        depth: currentDepth,
        children: [],
      });
      continue;
    }

    try {
      // Fetch related questions for this question
      const relatedData = await fetchRelatedQuestions(
        question.next_page_token,
        noCache
      );
      let children = [];

      if (
        relatedData.related_questions &&
        relatedData.related_questions.length > 0
      ) {
        children = await buildQuestionTree(
          relatedData.related_questions,
          maxDepth,
          currentDepth + 1,
          noCache
        );
      }

      results.push({
        ...cleanQuestionData(question),
        depth: currentDepth,
        children,
      });
    } catch (error) {
      // If there's an error, just add the question without children
      results.push({
        ...cleanQuestionData(question),
        depth: currentDepth,
        children: [],
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Remove unnecessary fields from question data
 * @param {Object} question The question object
 * @returns {Object} Cleaned question object
 */
function cleanQuestionData(question) {
  // Destructure to extract everything except the fields we want to remove
  const { next_page_token, serpapi_link, ...cleanedQuestion } = question;

  return cleanedQuestion;
}
