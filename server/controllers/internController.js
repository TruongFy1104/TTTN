const Intern = require('../models/intern');

exports.getAllInterns = async (req, res) => {
  const interns = await Intern.findAll();
  res.json(interns);
};

exports.createIntern = async (req, res) => {
  const { fullName, phoneNumber, address, lat, lng } = req.body;
  if (!fullName || !phoneNumber || !address) {
    return res.status(400).json({ error: 'Thiếu thông tin thực tập sinh' });
  }
  
  // Xử lý lat/lng: loại bỏ dấu chấm phân cách hàng nghìn và chuyển thành số
  const parseLat = lat ? parseFloat(String(lat).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  const parseLng = lng ? parseFloat(String(lng).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  
  const newIntern = await Intern.create({ 
    fullName, 
    phoneNumber, 
    address, 
    lat: parseLat, 
    lng: parseLng 
  });
  res.status(201).json(newIntern);
};

exports.deleteIntern = async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await Intern.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ error: 'Không tìm thấy thực tập sinh' });
  res.json({ success: true });
};

exports.updateIntern = async (req, res) => {
  const id = Number(req.params.id);
  const { fullName, phoneNumber, address, lat, lng } = req.body;
  const intern = await Intern.findByPk(id);
  if (!intern) return res.status(404).json({ error: 'Không tìm thấy thực tập sinh' });
  
  // Xử lý lat/lng: loại bỏ dấu chấm phân cách hàng nghìn và chuyển thành số
  const parseLat = lat ? parseFloat(String(lat).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  const parseLng = lng ? parseFloat(String(lng).replace(/\./g, '').replace(',', '.')) / 1000000 : null;
  
  await intern.update({ 
    fullName, 
    phoneNumber, 
    address, 
    lat: parseLat, 
    lng: parseLng 
  });
  res.json(intern);
};
