import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import gamesRoutes from './routes/games';
import scoresRoutes from './routes/scores';
import leaderboardRoutes from './routes/leaderboard';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import favoritesRoutes from './routes/favorites';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/games', gamesRoutes);
app.use('/scores', scoresRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/users', usersRoutes);
app.use('/admin', adminRoutes);
app.use('/favorites', favoritesRoutes);

app.get('/', (req, res) => {
  res.send('Game Launcher Server is running');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (Accessible on network)`);
});
