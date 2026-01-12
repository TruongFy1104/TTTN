const School = require('../models/school');

exports.getAllSchools = async (req, res) => {
  const schools = await School.findAll();
  res.json(schools);
};

exports.createSchool = async (req, res) => {
  const { schoolLevel, schoolName, address, area, lat, lng } = req.body;
  if (!schoolLevel || !schoolName || !address) {
    return res.status(400).json({ error: 'Thiếu thông tin điểm trường' });
  }
  
  // Xử lý lat/lng: loại bỏ dấu chấm phân cách hàng nghìn và chuyển thành số
  const parseLat = lat ? parseFloat(String(lat).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  const parseLng = lng ? parseFloat(String(lng).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  
  const newSchool = await School.create({ 
    schoolLevel, 
    schoolName, 
    address, 
    area, 
    lat: parseLat, 
    lng: parseLng 
  });
  res.status(201).json(newSchool);
};

exports.deleteSchool = async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await School.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ error: 'Không tìm thấy điểm trường' });
  res.json({ success: true });
};

exports.updateSchool = async (req, res) => {
  const id = Number(req.params.id);
  const { schoolLevel, schoolName, address, area, lat, lng } = req.body;
  const school = await School.findByPk(id);
  if (!school) return res.status(404).json({ error: 'Không tìm thấy điểm trường' });
  
  // Xử lý lat/lng: loại bỏ dấu chấm phân cách hàng nghìn và chuyển thành số
  const parseLat = lat ? parseFloat(String(lat).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  const parseLng = lng ? parseFloat(String(lng).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  
  await school.update({ 
    schoolLevel, 
    schoolName, 
    address, 
    area, 
    lat: parseLat, 
    lng: parseLng 
  });
  res.json(school);
};
