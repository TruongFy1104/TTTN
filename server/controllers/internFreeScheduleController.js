const InternFreeSchedule = require('../models/intern_free_schedule');
const Intern = require('../models/intern');

// Lấy lịch rảnh theo tuần
exports.getByWeek = async (req, res) => {
  const week = req.query.week;
  if (!week) return res.status(400).json({ error: 'Thiếu tham số week' });
  const schedules = await InternFreeSchedule.findAll({ where: { week } });
  // Ghép tên TTS
  const interns = await Intern.findAll();
  const result = schedules.map(sch => {
    const intern = interns.find(i => i.id === sch.internId);
    return {
      internId: sch.internId,
      fullName: intern ? intern.fullName : '',
      week: sch.week,
      schedule: JSON.parse(sch.schedule)
    };
  });
  res.json(result);
};


// Import nhiều lịch rảnh
exports.importMany = async (req, res) => {
  const arr = req.body; // [{ fullName, schedule, week }]
  if (!Array.isArray(arr)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const interns = await Intern.findAll();
  let ok = 0, fail = 0;
  const failedNames = [];
  
  // Helper function để chuẩn hóa tên
  const normalizeName = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Thay nhiều khoảng trắng thành 1
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Loại bỏ dấu
  };
  
  console.log('[IMPORT] Danh sách thực tập sinh trong DB:');
  interns.forEach(i => console.log(`  - "${i.fullName}" (normalized: "${normalizeName(i.fullName)}")`));
  
  for (const item of arr) {
    const normalizedItemName = normalizeName(item.fullName);
    
    // So sánh tên thực tập sinh (chuẩn hóa)
    const intern = interns.find(i => normalizeName(i.fullName) === normalizedItemName);
    
    if (!intern) {
      fail++;
      failedNames.push(item.fullName);
      console.log(`❌ Không tìm thấy: "${item.fullName}" (normalized: "${normalizedItemName}")`);
      continue;
    }
    
    await InternFreeSchedule.destroy({ where: { internId: intern.id, week: item.week } });
    await InternFreeSchedule.create({ internId: intern.id, week: item.week, schedule: JSON.stringify(item.schedule) });
    console.log(`✅ Tìm thấy: "${item.fullName}" -> ID ${intern.id}`);
    ok++;
  }
  console.log(`[IMPORT] Thành công: ${ok}, thất bại: ${fail}`);
  if (failedNames.length > 0) {
    console.log(`[IMPORT] Danh sách không tìm thấy: ${failedNames.join(', ')}`);
  }
  res.json({ success: true, ok, fail, failedNames });
};


// Cập nhật 1 cell lịch rảnh cho từng thực tập sinh
exports.updateCell = async (req, res) => {
  try {
    const { internId, week, index, value } = req.body;
    if (!internId || !week || typeof index !== 'number' || !value) {
      return res.status(400).json({ error: 'Thiếu tham số' });
    }
    // Tìm lịch tuần của TTS
    let scheduleRow = await InternFreeSchedule.findOne({ where: { internId, week } });
    if (!scheduleRow) {
      // Nếu chưa có thì tạo mới với mảng rỗng
      const emptySchedule = Array(14).fill('BUSY');
      emptySchedule[index] = value;
      scheduleRow = await InternFreeSchedule.create({ internId, week, schedule: JSON.stringify(emptySchedule) });
      return res.json({ success: true, created: true });
    }
    // Đã có thì cập nhật
    let scheduleArr = [];
    try {
      scheduleArr = JSON.parse(scheduleRow.schedule);
    } catch {
      scheduleArr = Array(14).fill('BUSY');
    }
    scheduleArr[index] = value;
    scheduleRow.schedule = JSON.stringify(scheduleArr);
    await scheduleRow.save();
    res.json({ success: true, updated: true });
  } catch (e) {
    console.error('[SCHEDULE][PUT] updateCell error:', e);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// Xóa lịch rảnh theo tuần
exports.deleteByWeek = async (req, res) => {
  try {
    const { week } = req.query;
    if (!week) {
      return res.status(400).json({ error: 'Thiếu tham số week' });
    }
    
    const deleted = await InternFreeSchedule.destroy({ where: { week } });
    console.log(`[DELETE] Đã xóa ${deleted} lịch rảnh của tuần ${week}`);
    
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('[SCHEDULE][DELETE] deleteByWeek error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};
