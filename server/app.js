require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const zod = require("zod");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const SECRET_KEY = process.env.JWT_SECRET;
const URI = process.env.MONGO_URI;

mongoose
  .connect(URI)
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.error("Database connection error:", err));

const users = mongoose.model("users", {
  username: String,
  password: String,
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  const signinSchema = zod.object({
    username: zod.string(),
    password: zod.string(),
  });

  const inputValidation = signinSchema.safeParse({ username, password });

  if (!inputValidation.success) {
    return res.status(400).json({ msg: "Enter valid inputs" });
  }

  try {
    const findUser = await users.findOne({ username });

    if (!findUser) {
      const newUser = new users({ username, password });
      await newUser.save();

      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ msg: "Token sent", token });
    } else {
      res.status(400).json({ msg: "Already registered. Please log in." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Some error occurred" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const findUser = await users.findOne({ username });

  try {
    if (!findUser) {
      return res.status(400).json({ msg: "User does not exist. Please sign up." });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ msg: "Token generated", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Some error occurred" });
  }
});

async function authenticateApp(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided. Access denied." });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token. Access denied." });
      }
      req.user = decoded;    
      next();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error in authentication" });
  }
}

function debtCalculator(days, sleepingHours) {
  if (days < 3) {
    return { msg: "Please enter data for more than 3 days" };
  }

  const totalSleepNeeded = days * 8;
  const totalSlept = sleepingHours.reduce((sum, hours) => sum + hours, 0);
  const sleepDebt = totalSleepNeeded - totalSlept;

  if (sleepingHours.length !== days) {
    return { msg: "Please enter correct data." };
  }

  return {
    message: `Total sleep needed: ${totalSleepNeeded} hours. You slept ${totalSlept} hours in ${days} days. You need ${sleepDebt} hours to recover.`,
  };
}

app.post("/debtCalculator", authenticateApp, (req, res) => {
  let { days, sleepingHours } = req.body;

  days = Number(days);
  sleepingHours = Array.isArray(sleepingHours) ? sleepingHours.map(Number) : [];

  if (isNaN(days) || days < 3 || sleepingHours.some(isNaN)) {
    return res.status(400).json({ error: "Invalid data provided." });
  }

  const result = debtCalculator(days, sleepingHours);
  return res.json(result);
});

app.get("/debtCalculator", authenticateApp, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/debtCalculator.html"));
});
