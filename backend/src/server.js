require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startEventListener } = require('./services/eventListener');
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
 app.listen(PORT, () => console.log('Server running on port ' + PORT));
 startEventListener();
});
