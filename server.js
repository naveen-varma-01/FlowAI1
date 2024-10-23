const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const cors = require('cors');
// const bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());
let db;
const port = process.env.PORT || 3000

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: path.join(__dirname , 'newexpenses.db' ),
            driver: sqlite3.Database,
        })
        app.listen(port, () => {
            console.log(`server is running at http://localhost:${port}`)
        })
    }
    catch (error) {
        console.log(`Database Error: ${error.message}`)
        process.exit(1)
    }
}

initializeDBAndServer();

// Sign Up

app.post('/signup', async (request,response) => {
    const {username,password,email} = request.body
    const hashedPassword = await bcrypt.hash(password,10);
    const UserQuery = `
        SELECT * FROM users WHERE username = '${username}' ;
    `;
    const dbuser = await db.get(UserQuery);
    if (dbuser == undefined) {
        const insertQuery = `
            INSERT INTO users (username,password,email) 
            VALUES ('${username}', '${hashedPassword}','${email}');
        `;
        const deResponse = await db.run(insertQuery);
        response.send({status:'User Added'});
        
    }
    else {
        response.status(400);
        response.send({status:'User Already Exists'});
    }
})

// Login 
app.post('/login', async (request, response) => {
    const {username,password} = request.body;
    const selectUserQuery = `
        SELECT * FROM users WHERE username = '${username}' ;
    `
    const dbUser = await db.get(selectUserQuery);
    
    if (dbUser == undefined) {
        response.status(400);
        response.send({status: "Invalid User"});
    }
    else {
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password)
        if (isPasswordMatched) {
            const payload = {username: username}
            const jwtToken = jwt.sign(payload,'jwt_token')
            response.send({jwtToken})
        }
        else {
            response.status(400);
            response.send({status:"Invalid Password"});
        }
    }
});

// Authentication Middleware
// const authenticateToken = (request, response, next) => {
//     let jwtToken;
//     const authHeader = request.headers["authorization"];
//     if (authHeader !== undefined) {
//       jwtToken = authHeader.split(" ")[1];
//     }
//     if (jwtToken === undefined) {
//       response.status(401);
//       response.send("Invalid JWT Token");
//     } else {
//       jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
//         if (error) {
//           response.status(401);
//           response.send("Invalid JWT Token");
//         } else {
//           request.username = payload.username;
//           next();
//         }
//       });
//     }
//   };

// POST Transaction
app.post('/transactions', async (req, res) => {
    const { type, category, amount, date, description } = req.body;
    const postQuery = `INSERT INTO transactions (type, category, amount, date, description) 
        VALUES ('${type}','${category}',${amount},'${date}','${description}');`;
    const postTransaction = await db.run(postQuery)
    const postId = postTransaction.lastID
    res.send({id: postId})
});

// GET Transactions
app.get('/transactions',async (req, res) => {
    const getQuery = `SELECT * FROM transactions;`
    const getTransactions = await db.all(getQuery)
    res.send(getTransactions);
});

// GET Transaction
app.get('/transactions/:id', async (req, res) => {
    const id = req.params.id;
    const getQuery = `SELECT * FROM transactions WHERE id = ${id};`
    const getTransaction = await db.get(getQuery)
    res.send(getTransaction)
});


// PUT Transaction
app.put('/transactions/:id', async (req, res) => {
    const id = req.params.id;
    const { type, category, amount, date, description } = req.body;
    const updateQuery = `UPDATE transactions 
    SET type = '${type}', category = '${category}', amount = ${amount}, date = '${date}', description = '${description}' WHERE id = ${id};`
    await db.run(updateQuery);
    res.send({UpdatedId: id})
});

//DELETE Transaction
app.delete('/transactions/:id', async (req,res) => {
    const id = req.params.id;
    const deleteQuery = `DELETE FROM transactions WHERE id = ${id};`
    await db.run(deleteQuery);
    res.send({DeletedId: id})
})

// Summary
app.get('/summary', async (req, res) => {
    const query = `SELECT type, SUM(amount) as total FROM transactions GROUP BY type`;
    const summary = await db.all(query)
    res.send(summary)
});

