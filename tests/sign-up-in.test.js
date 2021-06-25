import supertest from 'supertest';
import app from '../src/app.js';
import connection from '../src/database.js';

describe("POST /sign-up", () => {
    it("should respond with status 201  when there is no user with given email", async () => {
      const body = {
        name: 'Fulano',
        email: 'fulano@email.com',
        password: '123456'
      };
  
      const response = await supertest(app).post("/sign-up").send(body);
  
      expect(response.status).toEqual(201);
    });
    
    it("should respond with status 409 when there already is an user with given email", async () => {
        const body = {
          name: 'Fulano',
          email: 'fulano@email.com',
          password: '123456'
        };
    
        await connection.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`, [body.name, body.email, body.password]);
        const response = await supertest(app).post("/sign-up").send(body);
    
        expect(response.status).toEqual(409);
    });

    it("should respond with status 400 when password length is minor than 4", async () => {
        const body = {
          name: 'Fulano',
          email: 'fulano@email.com',
          password: '123'
        };
    
        await connection.query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`, [body.name, body.email, body.password]);
        const response = await supertest(app).post("/sign-up").send(body);
    
        expect(response.status).toEqual(400);
    });

});

describe("POST /sign-in", () => {
    it("should respond with status 200 when user exists and password is valid", async () => {
      const body = {
        name: "Fulano",
        email: "fulano@email.com",
        password: "123456"
      };
  
      await supertest(app).post("/sign-up").send(body);
      const response = await supertest(app).post("/sign-in").send({ email: body.email, password: body.password });
  
      expect(response.status).toEqual(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          token: expect.any(String)
        })
      );
    });

    it("should respond with status 401 when user doesn't exist", async () => {
        const body = {
          name: "Fulano",
          email: "fulano@email.com",
          password: "123456"
        };
    
        await supertest(app).post("/sign-up").send(body);
    
        const response = await supertest(app).post("/sign-in").send({ email: "email_nao_cadastrado@email.com", password: "senha_incorreta" });
    
        expect(response.status).toEqual(401);
      });

});

afterAll( async () => {
    await connection.query(`DELETE FROM users WHERE email = "fulano@email.com"`);
    connection.end();
});