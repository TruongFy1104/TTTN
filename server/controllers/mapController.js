

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

exports.findClosestIntern = async (req, res) => {
  const { school, interns } = req.body;
  if (!school || !interns || interns.length === 0) {
    return res.status(400).json({ error: 'Thiếu thông tin trường hoặc thực tập sinh' });
  }
  if (!school.lat || !school.lng) {
    return res.status(400).json({ error: 'Trường chưa có tọa độ (lat, lng)' });
  }
  let minIdx = 0;
  let minDistance = null;
  interns.forEach((intern, idx) => {
    if (intern.lat && intern.lng) {
      const dist = haversineDistance(Number(school.lat), Number(school.lng), Number(intern.lat), Number(intern.lng));
      if (minDistance === null || dist < minDistance) {
        minDistance = dist;
        minIdx = idx;
      }
    }
  });
  if (minDistance === null) {
    return res.status(400).json({ error: 'Không có thực tập sinh nào có tọa độ hợp lệ' });
  }
  const closest = interns[minIdx];
  res.json({
    ...closest,
    distance: `${minDistance.toFixed(2)} km`,
    duration: 'N/A (không dùng Google Maps)'
  });
};
