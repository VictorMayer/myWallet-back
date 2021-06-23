import express, { query } from 'express';
import bcrypt from 'bcrypt';
import cors from 'cors';
import pg from 'pg';

const server = express;
