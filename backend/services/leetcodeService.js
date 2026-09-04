// services/leetcodeService.js
//
// Wraps LeetCode's public (unauthenticated) GraphQL endpoint — the same one
// LeetCode's own website uses for a public profile's "Recent AC" list,
// solved-count stats, submission calendar, and the daily coding challenge.
// It's unofficial and undocumented, so failures are treated as "couldn't
// verify" rather than "definitely didn't solve anything".

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

async function graphqlRequest(query, variables) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (compatible; TaskReminderApp/1.0; +reminder-scheduler)',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`LeetCode API responded with HTTP ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

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

async function fetchRecentAcceptedSubmissions(username, limit = 20) {
  const data = await graphqlRequest(RECENT_AC_QUERY, { username, limit });
  return data?.recentAcSubmissionList || [];
}

async function hasSolvedSince(username, sinceUtc) {
  const submissions = await fetchRecentAcceptedSubmissions(username, 20);
  const sinceSeconds = Math.floor(sinceUtc.getTime() / 1000);
  return submissions.some((s) => Number(s.timestamp) >= sinceSeconds);
}

const USER_STATS_QUERY = `
  query userStats($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      submissionCalendar
    }
  }
`;

async function fetchUserStats(username) {
  const data = await graphqlRequest(USER_STATS_QUERY, { username });
  const matchedUser = data?.matchedUser;
  if (!matchedUser) throw new Error(`LeetCode user "${username}" not found`);

  const solvedByDifficulty = { easy: 0, medium: 0, hard: 0, all: 0 };
  for (const entry of matchedUser.submitStats?.acSubmissionNum || []) {
    const key = entry.difficulty.toLowerCase();
    if (key in solvedByDifficulty) solvedByDifficulty[key] = entry.count;
  }

  return { solvedByDifficulty, submissionCalendarRaw: matchedUser.submissionCalendar };
}

const DAILY_CHALLENGE_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        title
        titleSlug
        difficulty
      }
    }
  }
`;

let dailyChallengeCache = { data: null, fetchedAt: 0 };
const DAILY_CHALLENGE_CACHE_MS = 60 * 60 * 1000; // 1 hour — same for every user

async function fetchDailyChallenge() {
  const now = Date.now();
  if (dailyChallengeCache.data && now - dailyChallengeCache.fetchedAt < DAILY_CHALLENGE_CACHE_MS) {
    return dailyChallengeCache.data;
  }
  const data = await graphqlRequest(DAILY_CHALLENGE_QUERY, {});
  const q = data?.activeDailyCodingChallengeQuestion;
  if (!q) throw new Error('No daily challenge data returned');

  const result = {
    title: q.question.title,
    titleSlug: q.question.titleSlug,
    difficulty: q.question.difficulty,
    url: `https://leetcode.com${q.link}`,
  };
  dailyChallengeCache = { data: result, fetchedAt: now };
  return result;
}

module.exports = { fetchRecentAcceptedSubmissions, hasSolvedSince, fetchUserStats, fetchDailyChallenge };
