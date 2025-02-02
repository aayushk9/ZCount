require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const zod = require("zod");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;

app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET
const URI = process.env.MONGO_URI

mongoose.connect(URI)
    .then(() => console.log("Connected to Database"));  

const users = mongoose.model('users', ({
    username: String,
    password: String  
}))

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
   
app.post("/signin", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // signin schema
    const signinSchema = zod.object({
        username: zod.string(),
        password: zod.string()
    })

    const inputValidation = signinSchema.safeParse({ username, password })

    if (!inputValidation.success) {
        res.json({
            msg: "Enter valid inputs"
        })
    }
    try {
        const findUser = await users.findOne({ username: username });
        if (!findUser) {
            
            const newUser = new users({
                username: username,
                password: password
            })
            await newUser.save();
            const token = jwt.sign({username}, SECRET_KEY);
            res.header('Authorization', `Bearer: ${token}`)
            res.json({
                msg: "Token sent",
                token: token
            })
            //res.redirect
        } else {
            res.json({
                msg: "You are already registered please go to login route"
            })
        }
    } catch (error) {
        res.json({
            msg: "Some error occured"
        })
    }

})

async function authenticateApp(req, res, next) {
    // how can we authenticate
    // via tokens
    const token = req.headers["authorization"] && req.headers["authorization"].split(' ')[1]; // extracts jwt token from authorisation header
    if (!token) {
        return res.status(401).json({
            msg: "Please provide the token"
        })
    }   
    try {
        const decoded = jwt.verify(token, SECRET_KEY)
        req.user = decoded;
        next()
    } catch (error) {
        res.json({
            msg: "Some error occured: " + error    
        })
    }
}

function debtCalculator(days, sleepingHours) {
    if (days <= 3) {
        return {    
            msg: "Please enter data for more than 3 days"
        }
    }

    const totalSleepNeeded = days * 8; // expected sleep = total days provided * 8
    const totalSlept = sleepingHours.slice(0, days).reduce((sum, hours) => sum + hours, 0);
    const sleepDebt = totalSleepNeeded - totalSlept // sleep debt = expected sleep - actual sleep

    if(sleepingHours.length !== days){  
        return {
            msg: "please enter correct data."   
        }   
    }   

    return { message: `Total sleep needed for ${days} days is ${totalSleepNeeded} hours. As per given data you have slept only for ${totalSlept} hours in ${days} days. So you need to sleep for ${sleepDebt} hours in order to cover the number of hours in coming days` }
}

// added  authenticateApp middleware for authentication

app.post("/debtCalculator", authenticateApp, (req, res) => {
    let days = req.body.days;
    let sleepingHours = req.body.sleepingHours;

    days = Number(days);

    if (isNaN(days) || days <= 0) {
        return res.status(400).json({ error: "Please provide valid numeric values for days" });
    }

    if (!Array.isArray(sleepingHours) || sleepingHours.length === 0) {
        return res.status(400).json({ error: "Please provide an array of sleep hours for each day." });
    }

    const result = debtCalculator(days, sleepingHours);

    if (result.error) {
        res.status(400).json({
            msg: "Some error occured"
        });
    }

    return res.json(result);
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const findUser = await users.findOne({ username: username });

    try {
        if (!findUser) {
            res.json({
                msg: "User does not exist, please go to signin page"
            })
        } else {
            // generate a token
            const token = jwt.sign({ username }, SECRET_KEY);
            res.header("Authorization", `Bearer; ${token}`)
            return res.json({
                msg: "Token generated",
                token: token
            })
        }
    } catch (error) {
        console.log(error);
    }
})

  