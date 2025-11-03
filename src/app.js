const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const querySchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(32).required()
}).required();

function createApp({ userService }) {
  if (!userService || typeof userService.findByUsername !== 'function') {
    throw new Error('userService with findByUsername function is required');
  }

  const app = express();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(helmet());
  app.use(limiter);

  app.get('/user', async (req, res, next) => {
    try {
      const { error, value } = querySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        return res.status(400).json({ error: 'Invalid username parameter' });
      }

      const result = await userService.findByUsername(value.username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
