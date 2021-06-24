import express, { query } from 'express';
import {v4 as uuid} from 'uuid';
import bcrypt from 'bcrypt';
import cors from 'cors';
import pg from 'pg';

const server = express();
server.use(express.json());
server.use(cors());

const databaseConfig = {
    user: 'postgres',
    password: '123456',
    database: 'mywallet',
    host: 'localhost',
    port: 5432
}

const connection = new pg.Pool(databaseConfig);

server.post("/sign-up", async (req, res) => {
    try{
        console.log(req.body);
        const { name, email, password } = req.body;
        const result = await connection.query(`SELECT * FROM users WHERE email=$1`,[email]);
        console.log(result.rows);
        
        if(password.length < 3) return res.status(400).send("A senha deve ter no mínimo 4 caractéres!");
        if(!result.rows[0]) return res.status(409).send("Esse email já está sendo utilizado");

        const hashedPassword = bcrypt.hashSync(password, 12);
        await connection.query(`INSERT INTO users (name, email, password) VALUES ($1,$2,$3)`, [name, email, hashedPassword]);
        res.sendStatus(201);
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
});

server.post("/sign-in", async (req, res) => {
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

server.delete("/user", async (req, res) => {
    try{
        const {id} = req.body;
        await connection.query(`DELETE FROM sessions WHERE "userId" = $1`,[id]);
        res.send();
    }catch(e){
        console.log(e);
        res.sendStatus(400);
    }
})

server.get("/user", async (req, res) =>{
    try{
        const authorization = req.headers['authorization'];
        const token = authorization?.replace('Bearer ', '');

        if(!token) return res.sendStatus(401);
        const result = await connection.query(`
            SELECT * FROM sessions
            JOIN users ON sessions."userId" = users.id
            WHERE sessions.token = $1
        `, [token]);
        const user = result.rows[0];
        console.log(result);
        if(user){
            const data = await connection.query(`SELECT * FROM transactions WHERE "userId" = $1`,[result.rows[0].id]);
            res.send(data.rows);
        } else {
            res.sendStatus(401);
        }
    }catch(e){
        console.log(e);
    }
});

server.listen(4000, () => {
    console.log("Server running on port 4000");
});