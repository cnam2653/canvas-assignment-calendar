require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5007;

app.use(express.json());
app.use(cors());

const CANVAS_API_URL = "https://umd.instructure.com/api/v1";

// Temporary in-memory token storage per user UID
const userTokens = {};

app.post("/api/save-token", (req, res) => {
  const { uid, token } = req.body;
  if (!uid || !token) return res.status(400).send("Missing uid or token");
  userTokens[uid] = token;
  console.log(`Saved Canvas token for user: ${uid}`);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Welcome to the server!");
});

app.get("/courses", async (req, res) => {
  try {
    const uid = req.query.uid;
    const userToken = userTokens[uid];
    if (!userToken) return res.status(401).json({ error: "No token for this user" });

    let courses = [];
    let url = `${CANVAS_API_URL}/courses?per_page=100`;

    while (url) {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      courses = [...courses, ...response.data];

      const linkHeader = response.headers.link;
      const nextPageMatch = linkHeader
        ? linkHeader.match(/<([^>]+)>; rel="next"/)
        : null;
      url = nextPageMatch ? nextPageMatch[1] : null;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const semester =
      month < 5
        ? `Spring ${year}`
        : month < 9
        ? `Summer ${year}`
        : `Fall ${year}`;

    const active = courses.filter(
      (c) =>
        c.name &&
        (c.name.includes(semester) ||
          c.name.includes("Organization of Programming Languages"))
    );

    const courseAssignments = await Promise.all(
      active.map(async (course) => {
        const assignments = await getAssignments(course.id, userToken);
        return {
          courseId: course.id,
          courseName: course.name,
          assignments: assignments.map((assignment) => {
            const due = assignment.due_at ? new Date(assignment.due_at) : null;
            const display =
              due && !isNaN(due.getTime())
                ? due.toLocaleString()
                : "No due date set";

            return {
              name: assignment.name,
              dueDate: display,
              dueDateIso: assignment.due_at,
              courseId: course.id,
              courseName: course.name,
            };
          }),
        };
      })
    );

    res.json(courseAssignments);
  } catch (err) {
    console.error("Error fetching courses:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

async function getAssignments(courseId, token) {
  try {
    let assignments = [];
    let url = `${CANVAS_API_URL}/courses/${courseId}/assignments?per_page=100`;

    while (url) {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      assignments = [...assignments, ...response.data];

      const linkHeader = response.headers.link;
      const nextPageMatch = linkHeader
        ? linkHeader.match(/<([^>]+)>; rel="next"/)
        : null;
      url = nextPageMatch ? nextPageMatch[1] : null;
    }

    return assignments;
  } catch (error) {
    console.error(
      `Error fetching assignments for course ${courseId}:`,
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch assignments");
  }
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
