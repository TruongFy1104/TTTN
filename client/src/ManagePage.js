import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const API_URL = '/api';

// Component tối ưu cho School Item để tránh re-render
const SchoolListItem = React.memo(({ school, onFindTTS, onDelete }) => (
  <div className="list-item">
    <div>
      <span className="bold">{school.schoolName}</span> <span className="small">({school.schoolLevel})</span>
      <div className="small">{school.address}</div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => onFindTTS(school)} className="btn-find">Tìm TTS</button>
      <button onClick={() => onDelete(school.id)} className="btn-delete">Xóa</button>
    </div>
  </div>
));

// Component tối ưu cho Intern Item
const InternListItem = React.memo(({ intern, onDelete }) => (
  <div className="list-item">
    <div>
      <span className="bold">{intern.fullName}</span>
      <div className="small">{intern.address}</div>
    </div>
    <button onClick={() => onDelete(intern.id)} className="btn-delete">Xóa</button>
  </div>
));

export default function ManagePage() {
  // State lịch rảnh TTS
  const [freeSchedules, setFreeSchedules] = useState([]);
  const [currentWeek, setCurrentWeek] = useState('');

  // Lấy tuần hiện tại (ISO week)
  useEffect(() => {
    const now = new Date();
    setCurrentWeek(`${now.getFullYear()}-W${getWeekNumber(now)}`);
    fetchFreeSchedules(`${now.getFullYear()}-W${getWeekNumber(now)}`);
  }, []);

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
  }

  // Gọi API lấy lịch rảnh tuần hiện tại
  async function fetchFreeSchedules(week) {
    try {
      const res = await fetch(`${API_URL}/intern-free-schedule?week=${week}`);
      const data = await res.json();
      setFreeSchedules(data);
    } catch {}
  }

  // Inline edit schedule (FREE/BUSY)
  const [editingCell, setEditingCell] = useState(null); // { internId, index }
  const getRowId = (r) => r?.internId || r?.id;

  const handleCellClick = (row, index) => {
  const rid = getRowId(row);
  console.log('[SCHEDULE] Click cell:', { internId: rid, index, row });
  if (!rid) return;
  setEditingCell({ internId: rid, index });
  };

  const updateCellValue = (row, index, value) => {
    const rid = getRowId(row);
    console.log('[SCHEDULE] Update cell value:', { internId: rid, index, value });
    setFreeSchedules(prev => prev.map(r => {
      const rId = getRowId(r);
      if (rId !== rid) return r;
      const schedule = Array.isArray(r.schedule) ? [...r.schedule] : [];
      schedule[index] = value;
      return { ...r, schedule };
    }));
    setEditingCell(null);
    persistScheduleChange(rid, index, value);
  };

  async function persistScheduleChange(internId, index, value) {
    try {
      console.log('[SCHEDULE] Persist change:', { internId, week: currentWeek, index, value });
      const res = await fetch(`${API_URL}/intern-free-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId, week: currentWeek, index, value })
      });
      if (!res.ok) throw new Error('Failed');
      console.log('[SCHEDULE] Persist success:', { internId, index, value });
    } catch (e) {
      console.error('[SCHEDULE] Persist failed:', e);
      setError('Lưu lịch thất bại — đã cập nhật tạm thời trên giao diện.');
    }
  }
  
  // Xóa toàn bộ lịch rảnh tuần hiện tại
  const deleteAllSchedules = async () => {
    if (!window.confirm(`Bạn có chắc muốn XÓA TOÀN BỘ lịch rảnh của tuần ${currentWeek}?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/intern-free-schedule/delete-week?week=${currentWeek}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Đã xóa ${data.deleted} lịch rảnh của tuần ${currentWeek}`);
        fetchFreeSchedules(currentWeek);
      } else {
        throw new Error('Lỗi khi xóa lịch rảnh');
      }
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  // Popup nhập thông tin khi chọn trường
  const [popupSchool, setPopupSchool] = useState(null);
  const [popupSoLuong, setPopupSoLuong] = useState(1);
  const [popupMoTa, setPopupMoTa] = useState('');
  const [interns, setInterns] = useState([]);
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState('');
  // List of assignments: [{school, soLuong, interns:[], moTa}]
  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem('assignments');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [internsRes, schoolsRes] = await Promise.all([
        fetch(`${API_URL}/interns`),
        fetch(`${API_URL}/schools`)
      ]);
      setInterns(await internsRes.json());
      setSchools(await schoolsRes.json());
    } catch (err) {
      setError('Không thể tải dữ liệu từ server.');
    }
  };

  const deleteIntern = useCallback(async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa thực tập sinh này?')) return;
    try {
      await fetch(`${API_URL}/interns/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch {}
  }, []);
  
  const deleteSchool = useCallback(async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa trường này?')) return;
    try {
      await fetch(`${API_URL}/schools/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch {}
  }, []);

  // Haversine formula
  function getDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Lấy thứ hiện tại (0=CN, 1=Thứ 2, ...)
  function getTodayIndex() {
    const now = new Date();
    let day = now.getDay(); // 0=CN, 1=Thứ 2, ...
    return day;
  }
  // Lấy thứ ngày hôm sau (0=CN, 1=Thứ 2, ...)
  function getTomorrowIndex() {
    let today = getTodayIndex();
    return (today + 1) % 7;
  }
  // Map index sang tên thứ
  const dayNamesMonFirst = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
  // JS getDay: 0=CN..6=Thứ 7; convert to Monday-first index 0..6
  function getTodayMonFirstIndex() {
    return (new Date().getDay() + 6) % 7;
  }
  function getTomorrowMonFirstIndex() {
    return (getTodayMonFirstIndex() + 1) % 7;
  }

  // LEGACY (không dùng nữa): giữ lại để tham chiếu
  function findClosestInternsLegacy(school, soLuong) {
    const usedIds = assignments.flatMap(a => [
      ...(Array.isArray(a.internsSang) ? a.internsSang.map(t => t.id) : []),
      ...(Array.isArray(a.internsChieu) ? a.internsChieu.map(t => t.id) : [])
    ]);
    const tomorrowIdx = getTomorrowMonFirstIndex();
    const sangIdx = tomorrowIdx * 2;
    const chieuIdx = tomorrowIdx * 2 + 1;
    const freeIdsSang = freeSchedules.filter(row => Array.isArray(row.schedule) && row.schedule[sangIdx] === 'FREE').map(row => row.internId || row.id);
    const freeIdsChieu = freeSchedules.filter(row => Array.isArray(row.schedule) && row.schedule[chieuIdx] === 'FREE').map(row => row.internId || row.id);
    const availableInternsSang = interns.filter(i => !usedIds.includes(i.id) && freeIdsSang.includes(i.id));
    const availableInternsChieu = interns.filter(i => !usedIds.includes(i.id) && freeIdsChieu.includes(i.id));
    const sortedSang = availableInternsSang.map(i => ({...i, distance: getDistance(school.latitude, school.longitude, i.latitude, i.longitude)})).sort((a,b) => a.distance - b.distance);
    const sortedChieu = availableInternsChieu.map(i => ({...i, distance: getDistance(school.latitude, school.longitude, i.latitude, i.longitude)})).sort((a,b) => a.distance - b.distance);
    return { sang: sortedSang.slice(0, soLuong), chieu: sortedChieu.slice(0, soLuong) };
  }

  // Hàm chuẩn: Lấy danh sách TTS rảnh đúng ngày (ngày mai) và đúng buổi theo giờ (8 = sáng, 13 = chiều), không lấy người đã được xếp cùng giờ
  const findAvailableInternsByHour = useCallback((school, soLuong, gioPhanCong) => {
    const hour = gioPhanCong === '13' ? '13' : '8';
    const usedIds = assignments
      .filter(a => a.gioPhanCong === hour)
      .flatMap(a => Array.isArray(a.interns) ? a.interns.map(t => t.id) : []);

    const dIdx = getTomorrowMonFirstIndex();
    const slotIdx = hour === '8' ? dIdx * 2 : dIdx * 2 + 1;

    const freeIdsSet = new Set(
      freeSchedules
        .filter(row => Array.isArray(row.schedule) && row.schedule[slotIdx] === 'FREE')
        .map(row => row.internId || row.id)
    );

    const available = interns
      .filter(i => freeIdsSet.has(i.id) && !usedIds.includes(i.id))
      .map(i => ({...i, distance: getDistance(school.latitude, school.longitude, i.latitude, i.longitude)}))
      .sort((a,b) => a.distance - b.distance);

    if (available.length === 0) {
      setError(`Không còn TTS rảnh vào ${dayNamesMonFirst[dIdx]} ca ${hour}h để phân công!`);
      return [];
    }
    setError('');
    return available.slice(0, soLuong);
  }, [assignments, freeSchedules, interns]);

  // Thêm hàm mới: Tìm TTS có thể làm cả ngày (sáng và chiều)
  const findAvailableInternsAllDay = useCallback((school, soLuong) => {
    const usedIds = assignments
      .flatMap(a => Array.isArray(a.interns) ? a.interns.map(t => t.id) : []);

    const dIdx = getTomorrowMonFirstIndex();
    const sangIdx = dIdx * 2;
    const chieuIdx = dIdx * 2 + 1;

    const freeIdsSet = new Set(
      freeSchedules
        .filter(row =>
          Array.isArray(row.schedule) &&
          row.schedule[sangIdx] === 'FREE' &&
          row.schedule[chieuIdx] === 'FREE'
        )
        .map(row => row.internId || row.id)
    );

    const available = interns
      .filter(i => freeIdsSet.has(i.id) && !usedIds.includes(i.id))
      .map(i => ({ ...i, distance: getDistance(school.latitude, school.longitude, i.latitude, i.longitude) }))
      .sort((a, b) => a.distance - b.distance);

    if (available.length === 0) {
      setError(`Không còn TTS rảnh cả ngày vào ${dayNamesMonFirst[dIdx]} để phân công!`);
      return [];
    }
    setError('');
    return available.slice(0, soLuong);
  }, [assignments, freeSchedules, interns]);

  // Add assignment row when clicking "Tìm TTS"
  // Khi bấm Tìm TTS, hiện popup nhập thông tin
  
  // Thêm state cho số lượng tối đa
  const [popupMaxSoLuong, setPopupMaxSoLuong] = useState(0);
  // Thêm state cho giờ phân công
  const [popupGioPhanCong, setPopupGioPhanCong] = useState('8'); // Mặc định 8h (sáng)
  // Thêm state cho chế độ chọn TTS (random hoặc manual)
  const [popupIsManualSelect, setPopupIsManualSelect] = useState(false);
  // Thêm state cho danh sách TTS được chọn thủ công
  const [popupSelectedInterns, setPopupSelectedInterns] = useState([]);
  // Thêm state cho danh sách TTS khả dụng
  const [popupAvailableInterns, setPopupAvailableInterns] = useState([]);
  // Thêm state cho việc mở/đóng dropdown chọn TTS
  const [showInternDropdown, setShowInternDropdown] = useState(false);

  // Khi mở popup: tính số TTS khả dụng theo giờ mặc định
  const handleAddAssignment = useCallback((school) => {
    // Determine which time slots are already assigned for this school and day
    const dIdx = getTomorrowMonFirstIndex();
    const assignedSlots = assignments.filter(a => a.school.id === school.id && a.dayIdx === dIdx).map(a => a.gioPhanCong);
    let defaultTime = '8';
    if (assignedSlots.includes('allDay')) {
      setError('Trường này đã được phân công cả ngày.');
      return;
    }
    if (assignedSlots.includes('8') && assignedSlots.includes('13')) {
      setError('Trường này đã được phân công cả sáng và chiều.');
      return;
    }
    if (!assignedSlots.includes('8')) defaultTime = '8';
    else if (!assignedSlots.includes('13')) defaultTime = '13';
    else defaultTime = 'allDay';
    let list = [];
    let max = 0;
    if (defaultTime === 'allDay') {
      list = findAvailableInternsAllDay(school, 9999);
      max = Array.isArray(list) ? list.length : 0;
    } else {
      list = findAvailableInternsByHour(school, 9999, defaultTime);
      max = Array.isArray(list) ? list.length : 0;
    }
    setPopupSchool(school);
    setPopupGioPhanCong(defaultTime);
    setPopupMaxSoLuong(max);
    setPopupSoLuong(0);
    setPopupMoTa('');
    setPopupIsManualSelect(false);
    setPopupSelectedInterns([]);
    setPopupAvailableInterns(list);
    setShowInternDropdown(false);
  }, [assignments, findAvailableInternsAllDay, findAvailableInternsByHour]);

  // Xác nhận popup: thêm dòng vào bảng tổng hợp
  const handleConfirmAssignment = useCallback(() => {
    if (!popupSchool) return;
    
    let selectedInterns = [...popupSelectedInterns];
    
    // Thêm TTS random (không trùng với TTS đã chọn thủ công)
    if (popupSoLuong > 0) {
      const usedIds = [...assignments.flatMap(a => Array.isArray(a.interns) ? a.interns.map(t => t.id) : []), ...popupSelectedInterns.map(i => i.id)];
      const available = popupAvailableInterns.filter(i => !usedIds.includes(i.id));
      const randomInterns = available.slice(0, popupSoLuong);
      selectedInterns = [...selectedInterns, ...randomInterns];
    }
    
    if (selectedInterns.length === 0) {
      setError('Vui lòng chọn ít nhất 1 TTS hoặc nhập số lượng random');
      return;
    }
    
    setAssignments(prev => {
      const updated = [...prev, {
        school: popupSchool,
        soLuong: selectedInterns.length,
        gioPhanCong: popupGioPhanCong,
        interns: selectedInterns,
        moTa: popupMoTa
      }];
      try { localStorage.setItem('assignments', JSON.stringify(updated)); } catch {}
      return updated;
    });
    setPopupSchool(null);
    setPopupSoLuong(0);
    setPopupMoTa('');
    setPopupMaxSoLuong(0);
    setPopupGioPhanCong('8');
    setPopupIsManualSelect(false);
    setPopupSelectedInterns([]);
    setPopupAvailableInterns([]);
    setShowInternDropdown(false);
  }, [popupSchool, popupSelectedInterns, popupSoLuong, popupAvailableInterns, popupGioPhanCong, popupMoTa, assignments]);

  // Xóa dòng khỏi bảng tổng hợp
  const handleDeleteAssignment = useCallback((idx) => {
    setAssignments(prev => {
      const updated = prev.filter((_,i) => i!==idx);
      try { localStorage.setItem('assignments', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Update assignment row (soLuong or moTa)
  const handleAssignmentChange = useCallback((idx, field, value) => {
    setAssignments(prev => {
      const updated = prev.map((row,i) => {
        if (i !== idx) return row;
        if (field === 'soLuong') {
          const hour = row.gioPhanCong || '8';
          const listAll = findAvailableInternsByHour(row.school, 9999, hour);
          const maxSoLuong = Array.isArray(listAll) ? listAll.length : 0;
          const soLuong = Math.max(1, Math.min(Number(value), maxSoLuong));
          const closest = findAvailableInternsByHour(row.school, soLuong, hour);
          return {...row, soLuong, interns: closest};
        }
        if (field === 'moTa') {
          return {...row, moTa: value};
        }
        if (field === 'editMoTa') {
          return {...row, editMoTa: value};
        }
        if (field === 'thoiGianTapTrung') {
          return {...row, thoiGianTapTrung: value};
        }
        if (field === 'editGioDen') {
          return {...row, editGioDen: value};
        }
        return row;
      });
      try { localStorage.setItem('assignments', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [findAvailableInternsByHour]);
  // Khôi phục assignments khi reload trang (nếu có thay đổi interns/schools)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('assignments');
      if (saved) setAssignments(JSON.parse(saved));
    } catch {}
  }, [interns, schools]);

  const tableRef = useRef();
  const handleCapture = useCallback(async () => {
    if (!tableRef.current) return;
    const canvas = await (await import('html2canvas')).default(tableRef.current);
    const link = document.createElement('a');
    link.download = 'phancong.png';
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  // Remove old phanCongData logic

  // Thêm state cho từ khóa tìm kiếm trường
  const [schoolSearch, setSchoolSearch] = useState('');

  // Tối ưu: Filter schools với useMemo để tránh tính toán lại mỗi lần render
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools;
    const searchLower = schoolSearch.toLowerCase();
    return schools.filter(school => 
      school.schoolName.toLowerCase().includes(searchLower)
    );
  }, [schools, schoolSearch]);

  // Group assignments theo school để merge rows
  const groupedAssignments = useMemo(() => {
    const groups = [];
    const schoolMap = new Map();
    
    assignments.forEach((assignment, idx) => {
      const schoolId = assignment.school.id;
      if (!schoolMap.has(schoolId)) {
        schoolMap.set(schoolId, []);
        groups.push({ schoolId, assignments: schoolMap.get(schoolId) });
      }
      schoolMap.get(schoolId).push({ ...assignment, originalIdx: idx });
    });
    
    return groups;
  }, [assignments]);

  // Thêm danh sách tùy chọn giờ phân công
  const timeOptions = [
    { label: '8h (Sáng)', value: 'morning' },
    { label: '13h (Chiều)', value: 'afternoon' },
    { label: 'Cả ngày', value: 'allDay' },
  ];

  function handleTimeChange(selectedTime) {
    setPopupGioPhanCong(selectedTime);
    if (selectedTime === 'allDay') {
      setPopupMaxSoLuong(findAvailableInternsAllDay(popupSchool, popupMaxSoLuong).length);
    } else {
      setPopupMaxSoLuong(findAvailableInternsByHour(popupSchool, selectedTime, popupMaxSoLuong).length);
    }
  }

  return (
    <div className="container">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <b>Lịch rảnh thực tập sinh tuần {currentWeek}:</b>
          <button
            onClick={deleteAllSchedules}
            style={{
              padding: '8px 16px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Xóa toàn bộ lịch rảnh
          </button>
        </div>
        <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ border: '1px solid #ccc', padding: 6, verticalAlign: 'middle' }}>Tên TTS</th>
              {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'].map(day => (
                <th key={day} colSpan={2} style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{day}</th>
              ))}
            </tr>
            <tr>
              {Array(7).fill(0).map((_,i) => (
                <React.Fragment key={i}>
                  <th key={'sang'+i} style={{ border: '1px solid #ccc', padding: 6 }}>Sáng</th>
                  <th key={'chieu'+i} style={{ border: '1px solid #ccc', padding: 6 }}>Chiều</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {freeSchedules.map((row, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.fullName}</td>
                {/* Sáng: 0,2,4,6,8,10,12; Chiều: 1,3,5,7,9,11,13 */}
                {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(i => {
                  const val = row.schedule?.[i];
                  const isEditing = editingCell && editingCell.internId === getRowId(row) && editingCell.index === i;
                  return (
                    <td
                      key={i}
                      onClick={() => handleCellClick(row, i)}
                      style={{
                        position:'relative',
                        cursor:'pointer',
                        border:'1px solid #ccc',
                        padding:6,
                        background: val==='FREE' ? '#e0f7fa' : val==='BUSY' ? '#ffe0e0' : '#fff'
                      }}
                      title="Nhấp để chỉnh FREE/BUSY"
                    >
                      {val}
                      {isEditing && (
                        <div style={{position:'absolute',top:4,left:4,display:'flex',gap:6,background:'#fff',border:'1px solid #ccc',borderRadius:6,padding:'4px 6px',zIndex:2,boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}} onClick={(e)=>e.stopPropagation()}>
                          <button style={{padding:'2px 6px',borderRadius:4,border:'1px solid #0aa',background:'#e6fffb'}} onClick={()=>updateCellValue(row,i,'FREE')}>FREE</button>
                          <button style={{padding:'2px 6px',borderRadius:4,border:'1px solid #a00',background:'#ffeaea'}} onClick={()=>updateCellValue(row,i,'BUSY')}>BUSY</button>
                          <button style={{padding:'2px 6px',borderRadius:4,border:'1px solid #999',background:'#f5f5f5'}} onClick={()=>setEditingCell(null)}>Đóng</button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Quản lý & Điều phối</h2>
      {error && <div className="alert">{error}</div>}
      <div className="grid">
        <div className="column">
          <div className="card">
            <h3>Danh Sách Điểm Trường</h3>
            {/* Thanh tìm kiếm trường */}
            <input
              type="text"
              placeholder="Tìm kiếm tên trường..."
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              style={{ margin: '8px 0', padding: '8px', width: '100%' }}
            />
            <div className="list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredSchools.map(school => (
                <SchoolListItem 
                  key={school.id} 
                  school={school} 
                  onFindTTS={handleAddAssignment} 
                  onDelete={deleteSchool} 
                />
              ))}
            </div>
          </div>
        </div>
        <div className="column">
          <div className="card">
            <h3>Danh Sách Thực Tập Sinh</h3>
            <div className="list" style={{maxHeight:'400px',overflowY:'auto'}}>
              {interns.map(intern => (
                <InternListItem 
                  key={intern.id} 
                  intern={intern} 
                  onDelete={deleteIntern} 
                />
              ))}
            </div>
          </div>
          {/* Remove old assignment result card */}
        </div>
      </div>
      
      {/* Popup nhập số lượng và mô tả công việc với overlay blur */}
      {popupSchool && (
        <>
          {/* Overlay màu đen trong suốt + blur */}
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:999,background:'rgba(0,0,0,0.18)',backdropFilter:'blur(7px)'}}></div>
          {/* Popup nổi bật ở giữa */}
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',overflow:'auto'}}>
            <div style={{background:'rgba(255,255,255,0.98)',padding:'40px 32px',borderRadius:18,minWidth:340,maxWidth:600,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.18)',display:'flex',flexDirection:'column',alignItems:'center'}}>
              <h3 style={{marginBottom:18,fontSize:22,fontWeight:700}}>Phân công TTS cho trường</h3>
              <div style={{marginBottom:18,fontSize:18,fontWeight:600,textAlign:'center'}}>{popupSchool.schoolName}</div>
              
              <div style={{marginBottom:18,width:'100%',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <label style={{fontWeight:500,marginBottom:6}}>Giờ phân công</label>
                <select value={popupGioPhanCong} onChange={e => {
                          const hour = e.target.value;
                          setPopupGioPhanCong(hour);
                          if (popupSchool) {
                            let list = [];
                            if (hour === 'allDay') {
                              list = findAvailableInternsAllDay(popupSchool, 9999);
                            } else {
                              list = findAvailableInternsByHour(popupSchool, 9999, hour);
                            }
                            const max = Array.isArray(list) ? list.length : 0;
                            setPopupMaxSoLuong(max);
                            setPopupSoLuong(0);
                            setPopupAvailableInterns(list);
                            setPopupSelectedInterns([]);
                            setShowInternDropdown(false);
                          }
                        }} style={{width:120,padding:'8px 12px',borderRadius:10,border:'1.5px solid #bbb',textAlign:'center',fontSize:18,marginBottom:4}}>
                  {/* Disable options if already assigned */}
                  <option value="8" disabled={assignments.some(a => a.school.id === popupSchool?.id && a.gioPhanCong === '8' && a.dayIdx === getTomorrowMonFirstIndex())}>8h (Sáng)</option>
                  <option value="13" disabled={assignments.some(a => a.school.id === popupSchool?.id && a.gioPhanCong === '13' && a.dayIdx === getTomorrowMonFirstIndex())}>13h (Chiều)</option>
                  <option value="allDay" disabled={assignments.some(a => a.school.id === popupSchool?.id && a.gioPhanCong === 'allDay' && a.dayIdx === getTomorrowMonFirstIndex())}>Cả ngày</option>
                </select>
              </div>
              
              {/* Chọn TTS chỉ định */}
              <div style={{marginBottom:18,width:'100%',display:'flex',flexDirection:'column',alignItems:'center',position:'relative'}}>
                <label style={{fontWeight:500,marginBottom:6}}>Chọn TTS chỉ định (không bắt buộc)</label>
                
                {/* Ô input hiển thị TTS đã chọn và dropdown */}
                <div 
                  onClick={() => setShowInternDropdown(!showInternDropdown)}
                  style={{
                    width:'100%',
                    minHeight:40,
                    padding:'8px 12px',
                    borderRadius:10,
                    border:'1.5px solid #bbb',
                    fontSize:15,
                    background:'#fff',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    flexWrap:'wrap',
                    gap:6
                  }}
                >
                  {popupSelectedInterns.length === 0 ? (
                    <span style={{color:'#999'}}>Bấm để chọn TTS...</span>
                  ) : (
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      {popupSelectedInterns.map(intern => (
                        <span key={intern.id} style={{background:'#e6f7ff',padding:'4px 8px',borderRadius:6,fontSize:14}}>
                          {intern.fullName}
                        </span>
                      ))}
                    </div>
                  )}
                  <span style={{fontSize:12}}>▼</span>
                </div>

                {/* Dropdown list */}
                {showInternDropdown && (
                  <div style={{
                    position:'absolute',
                    top:'100%',
                    left:0,
                    right:0,
                    marginTop:4,
                    maxHeight:250,
                    overflowY:'auto',
                    border:'1.5px solid #bbb',
                    borderRadius:10,
                    background:'#fff',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
                    zIndex:10
                  }}>
                    {popupAvailableInterns.length === 0 ? (
                      <div style={{padding:20,textAlign:'center',color:'#888'}}>Không có TTS khả dụng</div>
                    ) : (
                      popupAvailableInterns.map(intern => (
                        <label 
                          key={intern.id} 
                          style={{
                            display:'flex',
                            alignItems:'center',
                            gap:10,
                            padding:'10px 12px',
                            cursor:'pointer',
                            borderBottom:'1px solid #f0f0f0',
                            background:popupSelectedInterns.find(i => i.id === intern.id) ? '#e6f7ff' : '#fff',
                            transition:'background 0.2s'
                          }}
                          onMouseEnter={(e) => { if (!popupSelectedInterns.find(i => i.id === intern.id)) e.currentTarget.style.background = '#f5f5f5'; }}
                          onMouseLeave={(e) => { if (!popupSelectedInterns.find(i => i.id === intern.id)) e.currentTarget.style.background = '#fff'; }}
                        >
                          <input 
                            type="checkbox"
                            checked={!!popupSelectedInterns.find(i => i.id === intern.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setPopupSelectedInterns(prev => [...prev, intern]);
                              } else {
                                setPopupSelectedInterns(prev => prev.filter(i => i.id !== intern.id));
                              }
                            }}
                            style={{cursor:'pointer'}}
                          />
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:15}}>{intern.fullName}</div>
                            <div style={{fontSize:13,color:'#666',marginTop:2}}>{intern.address}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
                
                <div style={{marginTop:6,fontSize:13,color:'#666',textAlign:'center'}}>
                  {popupSelectedInterns.length > 0 && `Đã chọn: ${popupSelectedInterns.length} TTS`}
                </div>
              </div>

              {/* Số lượng Random thêm */}
              <div style={{marginBottom:18,width:'100%',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <label style={{fontWeight:500,marginBottom:6}}>Số lượng Random thêm (không bắt buộc)</label>
                <input 
                  type="number" 
                  min={0} 
                  max={Math.max(0, popupMaxSoLuong - popupSelectedInterns.length)} 
                  value={popupSoLuong}
                  style={{width:100,padding:'8px 12px',borderRadius:10,border:'1.5px solid #bbb',textAlign:'center',fontSize:18}}
                  onChange={e => setPopupSoLuong(Math.max(0, Math.min(Number(e.target.value), popupMaxSoLuong - popupSelectedInterns.length)))} 
                />
                <div style={{marginTop:6,fontSize:13,color:'#666'}}>
                  Tổng: {popupSelectedInterns.length + popupSoLuong} TTS
                </div>
              </div>

              <div style={{marginBottom:18,width:'100%',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <label style={{fontWeight:500,marginBottom:6}}>Mô tả công việc</label>
                <textarea value={popupMoTa} onChange={e => setPopupMoTa(e.target.value)} rows={4}
                  style={{width:'98%',minWidth:180,maxWidth:520,padding:'10px 14px',borderRadius:10,border:'1.5px solid #bbb',fontSize:16,resize:'vertical',background:'#f8f8f8'}}
                  placeholder="Nhập mô tả công việc..." />
              </div>
              <div style={{display:'flex',gap:18,marginTop:10,justifyContent:'center',width:'100%'}}>
                <button className="btn-confirm" style={{padding:'10px 28px',fontSize:17,borderRadius:10,fontWeight:600}} onClick={handleConfirmAssignment} disabled={popupSelectedInterns.length === 0 && popupSoLuong === 0}>Xác nhận</button>
                <button className="btn-delete" style={{padding:'10px 28px',fontSize:17,borderRadius:10,fontWeight:600}} onClick={()=>{
                  setPopupSchool(null);
                  setPopupIsManualSelect(false);
                  setPopupSelectedInterns([]);
                  setPopupAvailableInterns([]);
                  setPopupSoLuong(0);
                  setShowInternDropdown(false);
                }}>Hủy</button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Bảng tổng hợp phân công mới */}
      <div style={{marginTop:32}}>
        <h3>Bảng tổng hợp phân công</h3>
        <div ref={tableRef} style={{background:'#fff',padding:16,borderRadius:8,boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#fde68a'}}>
                <th style={{border:'1px solid #ddd',padding:8}}>STT</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Trường</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Địa chỉ</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Thứ</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Thời gian tập trung</th>
                <th style={{border:'1px solid #ddd',padding:8}}>TTS</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Số lượng</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Mô tả công việc</th>
                <th style={{border:'1px solid #ddd',padding:8}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={9} style={{textAlign:'center',padding:16}}>Chưa có dữ liệu phân công</td></tr>
              ) : (
                groupedAssignments.map((group, groupIdx) => 
                  group.assignments.map((row, subIdx) => {
                    const isFirstInGroup = subIdx === 0;
                    const rowSpan = group.assignments.length;
                    
                    return (
                      <tr key={row.originalIdx}>
                        {/* STT - chỉ hiện ở dòng đầu của group */}
                        {isFirstInGroup && (
                          <td rowSpan={rowSpan} style={{border:'1px solid #ddd',padding:8,verticalAlign:'middle',textAlign:'center'}}>
                            {groupIdx + 1}
                          </td>
                        )}
                        
                        {/* Tên trường - merge cho cùng trường */}
                        {isFirstInGroup && (
                          <td rowSpan={rowSpan} style={{border:'1px solid #ddd',padding:8,verticalAlign:'middle'}}>
                            {row.school.schoolName}
                          </td>
                        )}
                        
                        {/* Địa chỉ - merge cho cùng trường */}
                        {isFirstInGroup && (
                          <td rowSpan={rowSpan} style={{border:'1px solid #ddd',padding:8,verticalAlign:'middle'}}>
                            {row.school.address}
                          </td>
                        )}
                        
                        {/* Thứ - merge cho cùng trường */}
                        {isFirstInGroup && (
                          <td rowSpan={rowSpan} style={{border:'1px solid #ddd',padding:8,verticalAlign:'middle',textAlign:'center'}}>
                            {dayNamesMonFirst[getTomorrowMonFirstIndex()]}
                          </td>
                        )}
                        
                        {/* Thời gian tập trung - riêng cho mỗi buổi */}
                        <td style={{border:'1px solid #ddd',padding:8}}>
                          <input
                            type="text"
                            value={row.thoiGianTapTrung || (row.gioPhanCong === '8' ? '8h' : row.gioPhanCong === '13' ? '13h' : row.gioPhanCong === 'allDay' ? '8h' : '')}
                            onChange={e => handleAssignmentChange(row.originalIdx, 'thoiGianTapTrung', e.target.value)}
                            style={{width:'80px',padding:'6px 10px',borderRadius:8,border:'1px solid #ccc',fontSize:15}}
                            placeholder="Giờ tập trung"
                          />
                        </td>
                        
                        {/* TTS - riêng cho mỗi buổi */}
                        <td style={{border:'1px solid #ddd',padding:'8px 0',textAlign:'center',verticalAlign:'middle'}}>
                          {row.gioPhanCong === '8' ? (
                            <div>
                              <b>Sáng (8h):</b>
                              {Array.isArray(row.interns) && row.interns.length > 0
                                ? row.interns.map(i => (
                                    <div key={i.id} style={{whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden',padding:'2px 0'}}>{i.fullName}</div>
                                  ))
                                : <span style={{color:'#888'}}>Không có TTS phù hợp</span>
                              }
                            </div>
                          ) : row.gioPhanCong === '13' ? (
                            <div>
                              <b>Chiều (13h):</b>
                              {Array.isArray(row.interns) && row.interns.length > 0
                                ? row.interns.map(i => (
                                    <div key={i.id} style={{whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden',padding:'2px 0'}}>{i.fullName}</div>
                                  ))
                                : <span style={{color:'#888'}}>Không có TTS phù hợp</span>
                              }
                            </div>
                          ) : row.gioPhanCong === 'allDay' ? (
                            <div>
                              <b>Cả ngày (8h):</b>
                              {Array.isArray(row.interns) && row.interns.length > 0
                                ? row.interns.map(i => (
                                    <div key={i.id} style={{whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden',padding:'2px 0'}}>{i.fullName}</div>
                                  ))
                                : <span style={{color:'#888'}}>Không có TTS phù hợp</span>
                              }
                            </div>
                          ) : null}
                        </td>
                        
                        {/* Số lượng - riêng cho mỗi buổi */}
                        <td style={{border:'1px solid #ddd',padding:'8px 0',textAlign:'center',verticalAlign:'middle'}}>
                          {Array.isArray(row.interns) ? row.interns.length : 0}
                        </td>
                        
                        {/* Mô tả công việc - riêng cho mỗi buổi */}
                        <td style={{border:'1px solid #ddd',padding:'8px 0',textAlign:'left',verticalAlign:'top',background:'#f6ffed',minWidth:220,maxWidth:500}}>
                          {row.editMoTa ? (
                            <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                              <textarea
                                value={row.moTa}
                                onChange={e => handleAssignmentChange(row.originalIdx, 'moTa', e.target.value)}
                                style={{width:'98%',minWidth:180,maxWidth:400,padding:'10px 14px',borderRadius:8,border:'1px solid #ccc',fontSize:15,resize:'vertical',height:Math.max(60, 22 * ((row.moTa || '').split('\n').length))}}
                                placeholder="Nhập mô tả công việc..."
                              />
                              <button type="button" style={{padding:'6px 18px',borderRadius:8,margin:'0 8px',background:'#e0ffe0',fontWeight:600,cursor:'pointer'}}
                                onClick={() => handleAssignmentChange(row.originalIdx, 'editMoTa', false)}
                              >OK</button>
                            </div>
                          ) : (
                            <div style={{whiteSpace:'pre-line',fontSize:15,lineHeight:'1.7',padding:'10px 14px',borderRadius:8,border:'1px solid #ccc',minHeight:60,cursor:'pointer'}} onClick={() => handleAssignmentChange(row.originalIdx, 'editMoTa', true)}>
                              {row.moTa || <span style={{color:'#888'}}>Nhấn để nhập mô tả công việc</span>}
                            </div>
                          )}
                        </td>
                        
                        {/* Thao tác - riêng cho mỗi buổi */}
                        <td style={{border:'1px solid #ddd',padding:'8px 0',textAlign:'center',verticalAlign:'middle',background:'#fff'}}>
                          <button className="btn-delete" style={{padding:'6px 18px',borderRadius:8,margin:'0 8px'}} onClick={()=>handleDeleteAssignment(row.originalIdx)}>Xóa</button>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
        <button className="btn-confirm" style={{marginTop:16}} onClick={handleCapture}>Chụp màn hình bảng này</button>
      </div>
    </div>
  );
}
