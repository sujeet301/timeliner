// services/leetcodeService.js
//
// Wraps LeetCode's public (unauthenticated) GraphQL endpoint. This is the
// same endpoint LeetCode's own website uses for a public profile's "Recent
// AC" list, so it works for any username without an API key — but it's
// unofficial and undocumented, so failures are treated as "couldn't verify"
// rather than "definitely didn't solve anything" (see leetcodeReminderService).

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

/**
 * Fetches a user's most recent accepted submissions (newest first).
 * Throws on network failure, a non-2xx response, or a GraphQL error
 * (e.g. the username doesn't exist).
 */
async function fetchRecentAcceptedSubmissions(username, limit = 20) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // LeetCode's endpoint is picky about looking like a browser request.
      Referer: 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (compatible; TaskReminderApp/1.0; +reminder-scheduler)',
    },
    body: JSON.stringify({
      query: RECENT_AC_QUERY,
      variables: { username, limit },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API responded with HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  return json.data?.recentAcSubmissionList || [];
}

/**
 * True if `username` has at least one accepted submission at or after
 * `sinceUtc`. Used to answer "has this user solved anything today yet?".
 */
async function hasSolvedSince(username, sinceUtc) {
  const submissions = await fetchRecentAcceptedSubmissions(username, 20);
  const sinceSeconds = Math.floor(sinceUtc.getTime() / 1000);
  // LeetCode returns `timestamp` as a Unix-seconds string.
  return submissions.some((s) => Number(s.timestamp) >= sinceSeconds);
}

module.exports = { fetchRecentAcceptedSubmissions, hasSolvedSince };
