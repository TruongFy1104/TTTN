const Assignment = require('../models/assignment');
const Intern = require('../models/intern');
const School = require('../models/school');

// Lấy tất cả phân công
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Lấy thông tin intern và school
    const interns = await Intern.findAll();
    const schools = await School.findAll();
    
    const result = assignments.map(a => {
      const intern = interns.find(i => i.id === a.internId);
      const school = schools.find(s => s.id === a.schoolId);
      return {
        id: a.id,
        internId: a.internId,
        internName: intern ? intern.fullName : 'N/A',
        schoolId: a.schoolId,
        schoolName: school ? school.schoolName : 'N/A',
        week: a.week,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt
      };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy phân công theo tuần
exports.getByWeek = async (req, res) => {
  try {
    const { week } = req.query;
    if (!week) return res.status(400).json({ error: 'Thiếu tham số week' });
    
    const assignments = await Assignment.findAll({ where: { week } });
    const interns = await Intern.findAll();
    const schools = await School.findAll();
    
    const result = assignments.map(a => {
      const intern = interns.find(i => i.id === a.internId);
      const school = schools.find(s => s.id === a.schoolId);
      return {
        id: a.id,
        internId: a.internId,
        internName: intern ? intern.fullName : 'N/A',
        schoolId: a.schoolId,
        schoolName: school ? school.schoolName : 'N/A',
        week: a.week,
        status: a.status,
        notes: a.notes
      };
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tạo phân công thủ công
exports.createAssignment = async (req, res) => {
  try {
    const { internId, schoolId, week, notes } = req.body;
    
    if (!internId || !schoolId || !week) {
      return res.status(400).json({ error: 'Thiếu thông tin phân công' });
    }
    
    // Kiểm tra xem đã có phân công này chưa
    const existing = await Assignment.findOne({
      where: { internId, schoolId, week }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Phân công này đã tồn tại' });
    }
    
    const assignment = await Assignment.create({
      internId,
      schoolId,
      week,
      status: 'assigned',
      notes
    });
    
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Xóa phân công
exports.deleteAssignment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await Assignment.destroy({ where: { id } });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy phân công' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cập nhật trạng thái phân công
exports.updateAssignment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body;
    
    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Không tìm thấy phân công' });
    }
    
    await assignment.update({ status, notes });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
