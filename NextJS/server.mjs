import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import mongoose from 'mongoose';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
    
  });
  server.listen(3000, (err) => {
    if (err) throw err;
  });
});

process.on('SIGINT', async () => {
  try {
    await mongoose.disconnect(process.env.NEXT_PUBLIC_MONGODB_URI);
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error disconnecting from MongoDB', error);
    process.exit(1);
  }
});
