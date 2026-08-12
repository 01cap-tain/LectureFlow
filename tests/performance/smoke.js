import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8181";
const STUDENT_MATRIC_NO = __ENV.STUDENT_MATRIC_NO;
const STUDENT_PASSWORD = __ENV.STUDENT_PASSWORD;
const MODERATOR_EMAIL = __ENV.MODERATOR_EMAIL;
const MODERATOR_PASSWORD = __ENV.MODERATOR_PASSWORD;
const TEST_VENUE_ID = __ENV.TEST_VENUE_ID;

export const options = {
  vus: 2,
  iterations: 10,
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

function jsonHeaders(cookie) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  return { headers, jar: new http.CookieJar() };
}

function getSessionCookie(response) {
  const rawCookie = response.headers["Set-Cookie"] || "";
  const match = rawCookie.match(/lectureflow\.sid=[^;]+/);
  return match ? match[0] : "";
}

function logFailure(label, response) {
  if (response.status >= 200 && response.status < 400) return;

  console.error(`${label} failed: status=${response.status} body=${response.body}`);
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Pass it with -e ${name}=value`);
  }
}

function signinStudent() {
  requireEnv("STUDENT_MATRIC_NO", STUDENT_MATRIC_NO);
  requireEnv("STUDENT_PASSWORD", STUDENT_PASSWORD);

  const response = http.post(
    `${BASE_URL}/auth/signin`,
    JSON.stringify({
      matric_no: STUDENT_MATRIC_NO,
      password: STUDENT_PASSWORD,
    }),
    jsonHeaders(),
  );

  logFailure("student signin", response);

  check(response, {
    "student signin returned 200": (r) => r.status === 200,
    "student signin has session cookie": (r) => getSessionCookie(r).length > 0,
  });

  return getSessionCookie(response);
}

function signinModeratorIfConfigured() {
  if (!MODERATOR_EMAIL || !MODERATOR_PASSWORD) return "";

  const response = http.post(
    `${BASE_URL}/auth/signin`,
    JSON.stringify({
      email: MODERATOR_EMAIL,
      password: MODERATOR_PASSWORD,
    }),
    jsonHeaders(),
  );

  logFailure("moderator signin", response);

  check(response, {
    "moderator signin returned 200": (r) => r.status === 200,
    "moderator signin has session cookie": (r) => getSessionCookie(r).length > 0,
  });

  return getSessionCookie(response);
}

export function setup() {
  const health = http.get(`${BASE_URL}/health`, { jar: new http.CookieJar() });
  check(health, {
    "health returned 200": (r) => r.status === 200,
  });

  const studentCookie = signinStudent();

  const lecturesResponse = http.get(
    `${BASE_URL}/student/lectures`,
    jsonHeaders(studentCookie),
  );

  logFailure("setup student lectures", lecturesResponse);

  let venueId = TEST_VENUE_ID || "";
  try {
    const body = lecturesResponse.json();
    if (!venueId && body.lectures && body.lectures.length > 0) {
      venueId = String(body.lectures[0].venue_id || "");
    }
  } catch (_) {
    venueId = TEST_VENUE_ID || "";
  }

  // Sign in moderator after student setup request so it cannot destroy the student session.
  const moderatorCookie = signinModeratorIfConfigured();

  return { studentCookie, moderatorCookie, venueId };
}

export default function (data) {
  const roll = Math.random();

  // Main student traffic: this is the route most students will keep opening.
  if (roll < 0.88) {
    group("student lectures", () => {
      const response = http.get(
        `${BASE_URL}/student/lectures`,
        jsonHeaders(data.studentCookie),
      );

      logFailure("student lectures", response);

      check(response, {
        "student lectures returned 200": (r) => r.status === 200,
        "student lectures response is valid": (r) => r.json("success") === true,
      });
    });
  } else if (roll < 0.97 && data.venueId) {
    group("venue queue", () => {
      const response = http.get(
        `${BASE_URL}/student/venues/${data.venueId}/queue`,
        jsonHeaders(data.studentCookie),
      );

      logFailure("venue queue", response);

      check(response, {
        "venue queue returned 200": (r) => r.status === 200,
        "venue queue response is valid": (r) => r.json("success") === true,
      });
    });
  } else {
    group("low frequency authenticated actions", () => {
      const profile = http.get(
        `${BASE_URL}/profile/me`,
        jsonHeaders(data.studentCookie),
      );

      logFailure("profile", profile);

      check(profile, {
        "profile returned 200": (r) => r.status === 200,
      });

      // Optional moderator read-only check; no schedule is created during smoke test.
      if (data.moderatorCookie) {
        const myLectures = http.get(
          `${BASE_URL}/lectures/my`,
          jsonHeaders(data.moderatorCookie),
        );

        logFailure("moderator lectures", myLectures);

        check(myLectures, {
          "moderator lectures returned 200": (r) => r.status === 200,
        });
      }
    });
  }

  sleep(1);
}
