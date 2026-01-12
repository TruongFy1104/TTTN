// ...existing code...
const express = require('express');
const cors = require('cors');
const sequelize = require('./db'); // kết nối Sequelize

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Kiểm tra kết nối Sequelize
sequelize.authenticate()
  .then(() => {
    console.log('✅ Kết nối thành công với database MySQL');
  })
  .catch((error) => {
    console.error('❌ Không thể kết nối với database:', error);
  });

// Route test
app.get('/', (req, res) => {
  res.send('Hello! Server đang chạy 🚀');
});

// Import routes theo mô hình MVC
const internRoutes = require('./routes/internRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const mapRoutes = require('./routes/mapRoutes');
const internFreeScheduleRoutes = require('./routes/internFreeScheduleRoutes');

app.use('/api/interns', internRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api', mapRoutes);
app.use('/api/intern-free-schedule', internFreeScheduleRoutes);

// Xử lý lỗi API
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Tạo bảng nếu chưa có
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  });
});
