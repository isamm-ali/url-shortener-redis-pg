import express from 'express';
import dotenv from 'dotenv';
import urlRouter from "./routes/urlRoutes.js";
import { errorHandling } from './middlewares/errorMiddleware.js';

export const app = express();

app.use(express.json());
app.use('/', urlRouter);
app.use(errorHandling);