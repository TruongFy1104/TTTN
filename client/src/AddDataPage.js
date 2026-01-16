import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const API_URL = '/api';

export default function AddDataPage() {
  // State
  const [freeSchedules, setFreeSchedules] = useState([]);
  const [currentWeek, setCurrentWeek] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [internForm, setInternForm] = useState({ fullName: '', phoneNumber: '', address: '', lat: '', lng: '' });
  const [schoolForm, setSchoolForm] = useState({ schoolName: '', schoolLevel: 'Cấp 1', address: '', area: '', lat: '', lng: '' });
  const [freeScheduleFile, setFreeScheduleFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // State cho phân công thủ công
  const [assignmentForm, setAssignmentForm] = useState({ internId: '', schoolId: '', week: '', notes: '' });
  const [interns, setInterns] = useState([]);
  const [schools, setSchools] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Ref for file input
  const fileInputRef = useRef();

  // Lấy tuần hiện tại (ISO week)
  useEffect(() => {
    const now = new Date();
    const week = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    
    // Kiểm tra tuần đã lưu trong localStorage
    const savedWeek = localStorage.getItem('currentWeek');
    
    // Nếu tuần mới khác tuần cũ, reset lịch rảnh
    if (savedWeek && savedWeek !== week) {
      // Xóa lịch rảnh tuần cũ
      deleteOldSchedules(savedWeek, week);
    }
    
    // Lưu tuần hiện tại
    localStorage.setItem('currentWeek', week);
    
    setCurrentWeek(week);
    setAssignmentForm(prev => ({ ...prev, week }));
    fetchFreeSchedules(week);
    fetchInterns();
    fetchSchools();
    fetchAssignments(week);
  }, []);
  
  // Xóa lịch rảnh tuần cũ khi sang tuần mới
  async function deleteOldSchedules(oldWeek, newWeek) {
    try {
      Swal.fire({
        title: 'Phát hiện tuần mới!',
        html: `Chuyển từ tuần <b>${oldWeek}</b> sang <b>${newWeek}</b><br/>Dữ liệu lịch rảnh tuần cũ sẽ được xóa tự động.`,
        icon: 'info',
        timer: 3000,
        timerProgressBar: true
      });
      
      // Gọi API xóa lịch rảnh tuần cũ
      await fetch(`${API_URL}/intern-free-schedule/delete-week?week=${oldWeek}`, { 
        method: 'DELETE' 
      });
      
      console.log(`✅ Đã xóa lịch rảnh tuần ${oldWeek}`);
    } catch (error) {
      console.error('Lỗi khi xóa lịch rảnh cũ:', error);
    }
  }

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
  
  // Lấy danh sách thực tập sinh
  async function fetchInterns() {
    try {
      const res = await fetch(`${API_URL}/interns`);
      const data = await res.json();
      setInterns(data);
    } catch {}
  }
  
  // Lấy danh sách trường
  async function fetchSchools() {
    try {
      const res = await fetch(`${API_URL}/schools`);
      const data = await res.json();
      setSchools(data);
    } catch {}
  }
  
  // Lấy danh sách phân công
  async function fetchAssignments(week) {
    try {
      const res = await fetch(`${API_URL}/assignments/week?week=${week}`);
      const data = await res.json();
      setAssignments(data);
    } catch {}
  }

  // Import file Excel lịch rảnh
  const handleImportFreeSchedule = async (file) => {
    setError(''); setSuccess('');
    if (!file) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi!',
        text: 'Không có file để import!'
      });
      return;
    }
    
    setIsImporting(true);
    Swal.fire({
      title: 'Đang import...',
      text: 'Vui lòng đợi trong giây lát',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {header:1});
        console.log('Excel rows:', rows);
        const payload = [];
        for (let i=1; i<rows.length; i++) {
          const row = rows[i];
          const name = row[1]?.trim();
          if (!name) continue;
          let schedule = row.slice(2);
          if (!Array.isArray(schedule)) schedule = [];
          for (let j=0; j<14; j++) {
            if (typeof schedule[j] === 'undefined' || schedule[j] === null || schedule[j] === '') schedule[j] = 'BUSY';
          }
          payload.push({ fullName: name, schedule, week: currentWeek });
        }
        console.log('Payload gửi lên:', payload);
        const res = await fetch(`${API_URL}/intern-free-schedule/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        setIsImporting(false);
        if (res.ok) {
          const result = await res.json();
          fetchFreeSchedules(currentWeek);
          
          // Kiểm tra nếu tất cả đều thất bại
          const isAllFailed = result.ok === 0 && result.fail > 0;
          
          let htmlMessage = `Import lịch rảnh hoàn tất!<br/>Thành công: <b>${result.ok}</b> | Thất bại: <b>${result.fail}</b>`;
          if (result.failedNames && result.failedNames.length > 0) {
            htmlMessage += `<br/><br/><b>Không tìm thấy thực tập sinh:</b><br/>${result.failedNames.join('<br/>')}`;
          }
          
          Swal.fire({
            icon: isAllFailed ? 'error' : 'success',
            title: isAllFailed ? 'Thất bại!' : 'Thành công!',
            html: htmlMessage,
            width: 600
          });
        } else {
          const errText = await res.text();
          Swal.fire({
            icon: 'error',
            title: 'Thất bại!',
            text: 'Import lịch rảnh thất bại: ' + errText
          });
        }
      } catch (err) {
        setIsImporting(false);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi!',
          text: 'Lỗi khi đọc file hoặc gửi API: ' + err.message
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Import thực tập sinh hoặc trường học bằng file Excel
  const handleExcelImportInterns = async (file) => {
    setError(''); setSuccess('');
    if (!file) return;
    
    setIsImporting(true);
    Swal.fire({
      title: 'Đang import dữ liệu...',
      text: 'Vui lòng đợi trong giây lát',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {header:1});
        let okIntern = 0, failIntern = 0, okSchool = 0, failSchool = 0;
        
        for (let i=1; i<rows.length; i++) {
          const row = rows[i];
          const type = row[0]?.toString().toLowerCase().trim(); // Cột type
          
          if (type === 'school') {
            // Import trường học
            const school = {
              schoolName: row[6] || row[1], // schoolName hoặc fullName
              schoolLevel: row[7] || 'Cấp 1',
              address: row[3] || '',
              area: row[8] || '',
              lat: row[4] || '',
              lng: row[5] || ''
            };
            try {
              const res = await fetch(`${API_URL}/schools`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(school)
              });
              if (res.ok) okSchool++; else failSchool++;
            } catch { failSchool++; }
          } else {
            // Import thực tập sinh (mặc định)
            if (!row[1]) continue;
            const intern = {
              fullName: row[1],
              phoneNumber: row[2] || '',
              address: row[3] || '',
              lat: row[4] || '',
              lng: row[5] || ''
            };
            try {
              const res = await fetch(`${API_URL}/interns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(intern)
              });
              if (res.ok) okIntern++; else failIntern++;
            } catch { failIntern++; }
          }
        }
        
        setIsImporting(false);
        const messages = [];
        if (okIntern > 0 || failIntern > 0) {
          messages.push(`<b>Thực tập sinh:</b> ${okIntern} thành công, ${failIntern} lỗi`);
        }
        if (okSchool > 0 || failSchool > 0) {
          messages.push(`<b>Trường học:</b> ${okSchool} thành công, ${failSchool} lỗi`);
        }
        
        // Kiểm tra nếu tất cả đều thất bại
        const totalSuccess = okIntern + okSchool;
        const totalFail = failIntern + failSchool;
        const isAllFailed = totalSuccess === 0 && totalFail > 0;
        
        Swal.fire({
          icon: isAllFailed ? 'error' : 'success',
          title: isAllFailed ? 'Thất bại!' : 'Import hoàn tất!',
          html: messages.join('<br/>')
        });
      } catch (err) {
        setIsImporting(false);
        Swal.fire({
          icon: 'error',
          title: 'Lỗi!',
          text: 'Lỗi khi đọc file: ' + err.message
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Form handlers
  const handleInternFormChange = (e) => {
    setInternForm({ ...internForm, [e.target.name]: e.target.value });
  };
  const handleSchoolFormChange = (e) => {
    setSchoolForm({ ...schoolForm, [e.target.name]: e.target.value });
  };

  const addIntern = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_URL}/interns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(internForm)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      setSuccess('Thêm thực tập sinh thành công!');
      setInternForm({ fullName: '', phoneNumber: '', address: '', lat: '', lng: '' });
    } catch {
      setError('Thêm thực tập sinh thất bại.');
    }
  };

  const addSchool = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_URL}/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schoolForm)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      setSuccess('Thêm trường học thành công!');
      setSchoolForm({ schoolName: '', schoolLevel: 'Cấp 1', address: '', area: '', lat: '', lng: '' });
    } catch {
      setError('Thêm trường học thất bại.');
    }
  };
  
  // Xóa toàn bộ lịch rảnh tuần hiện tại
  const deleteAllSchedules = async () => {
    const result = await Swal.fire({
      title: 'Xác nhận xóa?',
      html: `Bạn có chắc muốn <b>xóa toàn bộ</b> lịch rảnh của tuần <b>${currentWeek}</b>?<br/><span style="color: red;">Hành động này không thể hoàn tác!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa tất cả',
      cancelButtonText: 'Hủy'
    });
    
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/intern-free-schedule/delete-week?week=${currentWeek}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const data = await response.json();
          Swal.fire({
            icon: 'success',
            title: 'Đã xóa!',
            text: `Đã xóa ${data.deleted} lịch rảnh của tuần ${currentWeek}`
          });
          fetchFreeSchedules(currentWeek);
        } else {
          throw new Error('Lỗi khi xóa lịch rảnh');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi!',
          text: error.message
        });
      }
    }
  };

  // Drag & drop Excel import (lịch rảnh)
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleExcelImportInterns(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
const handleClickDropzone = () => {
  if (fileInputRef.current) fileInputRef.current.click(); // Đúng
};
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFreeScheduleFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleSubmitFreeSchedule = () => {
    if (freeScheduleFile) {
      handleImportFreeSchedule(freeScheduleFile);
    } else {
      setError('Vui lòng chọn file Excel trước khi submit!');
      console.error('Không có file để import lịch rảnh!');
    }
  };

  return (
    <div className="container">
      <div className="import-dropzone" style={{marginBottom:24}}>
        <b>Import file Excel lịch rảnh thực tập sinh:</b><br/>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <div style={{fontSize:'0.95rem',color:'#555',marginTop:4}}>
          File mẫu: mỗi dòng là 1 TTS, cột đầu là tên, các cột tiếp là ca/ngày, giá trị là FREE/BUSY/trống.<br/>
        </div>
        <button
          type="button"
          style={{marginTop:8, padding:'6px 18px', borderRadius:6, background:'#00796b', color:'#fff', fontWeight:600, border:'none', cursor: isImporting ? 'not-allowed' : 'pointer', opacity: isImporting ? 0.6 : 1}}
          onClick={handleSubmitFreeSchedule}
          disabled={isImporting}
        >
          {isImporting ? 'Đang import...' : 'Submit'}
        </button>
      </div>
      <div
        className={`import-dropzone${dragOver ? ' dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClickDropzone}
      >
        Kéo thả hoặc bấm để chọn file Excel để import thực tập sinh/trường học<br/>
        <input
          type="file"
          accept=".xlsx,.xls"
          ref={fileInputRef}
          style={{display:'none'}}
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleExcelImportInterns(e.target.files[0]);
            }
          }}
        />
        <div style={{fontSize:'0.95rem',color:'#555',marginTop:4}}>
          File Excel: Cột 0 = type (school/intern), Cột 1 = fullName/schoolName, Cột 2 = phoneNumber,<br/>
          Cột 3 = address, Cột 4 = lat, Cột 5 = lng, Cột 6 = schoolName (nếu type=school),<br/>
          Cột 7 = schoolLevel, Cột 8 = area
        </div>
      </div>
      <div className="add-data-flex">
        <div>
          <h2>Thêm Thực Tập Sinh</h2>
          <form onSubmit={addIntern} className="card">
            <input type="text" name="fullName" value={internForm.fullName} onChange={handleInternFormChange} placeholder="Họ và tên" required />
            <input type="text" name="phoneNumber" value={internForm.phoneNumber} onChange={handleInternFormChange} placeholder="Số điện thoại" required />
            <input type="text" name="address" value={internForm.address} onChange={handleInternFormChange} placeholder="Địa chỉ cư trú" required />
            <input type="text" name="lat" value={internForm.lat} onChange={handleInternFormChange} placeholder="Vĩ độ (latitude)" required />
            <input type="text" name="lng" value={internForm.lng} onChange={handleInternFormChange} placeholder="Kinh độ (longitude)" required />
            <button type="submit">Thêm TTS</button>
          </form>
        </div>
        <div>
          <h2>Thêm Điểm Trường</h2>
          <form onSubmit={addSchool} className="card">
            <input type="text" name="schoolName" value={schoolForm.schoolName} onChange={handleSchoolFormChange} placeholder="Tên trường" required />
            <select name="schoolLevel" value={schoolForm.schoolLevel} onChange={handleSchoolFormChange}>
              <option>Cấp 1</option>
              <option>Cấp 2</option>
              <option>Cấp 3</option>
            </select>
            <input type="text" name="address" value={schoolForm.address} onChange={handleSchoolFormChange} placeholder="Địa chỉ trường" required />
            <input type="text" name="area" value={schoolForm.area} onChange={handleSchoolFormChange} placeholder="Khu vực (ví dụ: Thủ Đức)" required />
            <input type="text" name="lat" value={schoolForm.lat} onChange={handleSchoolFormChange} placeholder="Vĩ độ (latitude)" required />
            <input type="text" name="lng" value={schoolForm.lng} onChange={handleSchoolFormChange} placeholder="Kinh độ (longitude)" required />
            <button type="submit">Thêm Trường</button>
          </form>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {success && <div className="success">{success}</div>}
    </div>
  );
}
