import 'dotenv/config';
import app from './app.js';

// TODO (1b): connect to MongoDB before listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Atlas server listening on port ${PORT}`));
