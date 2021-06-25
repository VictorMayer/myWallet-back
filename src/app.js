import express, { query } from 'express';
import {v4 as uuid} from 'uuid';
import bcrypt from 'bcrypt';
import cors from 'cors';
import connection from './database.js';

const app = express();
app.use(express.json());
app.use(cors());

app.post("/sign-up", async (req, res) => {
    try{
        const { name, email, password } = req.body;
        const result = await connection.query(`SELECT * FROM users WHERE email=$1`,[email]);
        console.log(result);
        if(password.length < 3) return res.status(400).send("A senha deve ter no mínimo 4 caractéres!");
        if(!result.rows.length === 0 ) return res.status(409).send("Esse email já está sendo utilizado");

        const hashedPassword = bcrypt.hashSync(password, 12);
        await connection.query(`INSERT INTO users (name, email, password) VALUES ($1,$2,$3)`, [name, email, hashedPassword]);
        res.sendStatus(201);
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

app.post("/sign-in", async (req, res) => {
    try{
        const {email, password } = req.body;
        const result = await connection.query(`SELECT * FROM users WHERE email = $1`, [email]);
        const user = result.rows[0];
        if(user && bcrypt.compareSync(password, user.password)){
            const token = uuid();

            await connection.query(`
                INSERT INTO sessions ("userId", token) VALUES ($1,$2)
            `, [user.id, token]);

            res.send({user:user,token:token});
        } else {
            res.status(401).send("Usuário ou senha não encontrados!");
        }
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

app.delete("/user", async (req, res) => {
    try{
        const {id} = req.body;
        await connection.query(`DELETE FROM sessions WHERE "userId" = $1`,[id]);
        res.send();
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

app.get("/user", async (req, res) => {
    try{
        const authorization = req.headers['authorization'];
        const user = await validateToken(authorization);
        if(user){
            const data = await connection.query(`SELECT * FROM transactions WHERE "userId" = $1`,[user.id]);
            res.send(data.rows);
        } else {
            res.sendStatus(401);
        }
    }catch(e){
        console.log(e);
    }
});

app.post("/user", async (req, res) => {
    try{
        const authorization = req.headers['authorization'];
        const user = await validateToken(authorization);
        if(user){
            const {value, description, type} = req.body;
            const valueToCents = 100*(parseFloat(value).toFixed(2));
            if(type !== "income" && type !== "expense")return res.sendStatus(400).send("Error: invalid type transaction!");
            const date = await getDate();
            await connection.query(`INSERT INTO transactions ("userId", type, value, description, date) VALUES ($1,$2,$3,$4,$5)`, [user.userId, type, valueToCents, description, date]);
            res.sendStatus(200);
        }else{
            res.sendStatus(401);
        }
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

app.get("/banana-test", async (req, res) => {
    res.send(200);
})

function getDate(){
    const ts = Date.now();

    const date_ob = new Date(ts);
    const date = date_ob.getDate();
    const month = date_ob.getMonth() + 1;
    const year = date_ob.getFullYear();
    
    const formattedDate = (year + "-" + month + "-" + date);
    return formattedDate;
}

async function validateToken(authorization){
    const token = authorization?.replace('Bearer ', '');

    if(!token) return res.sendStatus(401);
    const result = await connection.query(`
        SELECT * FROM sessions
        JOIN users ON sessions."userId" = users.id
        WHERE sessions.token = $1
    `, [token]);
    console.log(result.rows);
    return result.rows[0];
}

export default app;