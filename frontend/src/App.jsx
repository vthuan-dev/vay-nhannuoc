import React, { useState, useEffect } from 'react';
import './index.css';
import LoanWorkflow from './components/LoanWorkflow';

function App() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const dateStr = `${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      setTime(`${dateStr} ${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div id="T_pt_root">
      {/* Header */}
      <div style={{ height: '100px', position: 'relative' }}>
        <img src="/images/logo.png" style={{ position: 'absolute', top: 20, left: 20, height: 60 }} alt="Logo" />
        <div style={{ position: 'absolute', top: 30, left: 100 }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a4f7a' }}>BỘ TÀI CHÍNH</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a4f7a', textTransform: 'uppercase' }}>Kho bạc nhà nước</div>
        </div>

        <div className="header-right">
          <img src="/images/email.png" alt="Email" />
          <img src="/images/rss.png" alt="RSS" />
          <img src="/images/face.png" alt="Facebook" />
          <img src="/images/tiwter.png" alt="Twitter" />
        </div>

        <div className="banner-date">
          <b>{time}</b>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ position: 'relative', background: 'linear-gradient(to bottom, #1a4f7a 0%, #0d2a41 100%)', height: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ul id="menu" style={{ background: 'none' }}>
          <li><a href="/">Trang chủ</a></li>
          <li><a href="#">Giới thiệu KBNN</a></li>
          <li><a href="#">Chiến lược phát triển KBNN</a></li>
          <li><a href="#" style={{ color: '#ffcc00' }}>Hỗ trợ vay vốn</a></li>
        </ul>
        <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
          <input type="text" placeholder="Tìm kiếm" style={{ padding: '4px 10px', fontSize: '12px', border: 'none', borderRadius: '4px 0 0 4px', width: '150px' }} />
          <button style={{ background: '#4a90c2', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '0 4px 4px 0' }}>
            <img src="/images/search_bt.png" width="16" alt="Search" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', padding: '10px', backgroundColor: '#fff' }}>
        {/* Left Sidebar */}
        <div style={{ width: '275px', marginRight: '10px' }}>
          <div className="leftmenu-content">
            {[
              { label: 'Đại hội Đảng bộ' },
              { label: 'Hỏi đáp - Kiến nghị' },
              { label: 'Văn hóa nghề kho bạc' },
              { label: 'Tiếp công dân và cập nhật nội dung', active: true },
              { label: 'Hệ thống văn bản' },
              { label: 'Tin tức sự kiện' },
              { label: 'Thông báo' },
              { label: 'Báo cáo thường niên hệ thống KBNN' },
              { label: 'Tin media' },
              { label: 'Trái phiếu Chính phủ' },
              { label: 'KBNN chuyển đổi mô hình tổ chức bộ máy mới' },
              { label: 'Tỷ giá hạch toán' },
              { label: 'Thông tin đấu thầu' }
            ].map((item, idx) => (
              <a key={idx} href="#" className={item.active ? "x2bz" : "x2by"}>
                <img src="/images/arrow_dots.png" width="8" alt="icon" style={{ marginRight: '8px' }} />
                {item.label}
              </a>
            ))}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="http://dangcongsan.vn" target="_blank" rel="noreferrer"><img src="/images/dangcongsan.png" style={{ width: '100%' }} alt="Đảng Cộng Sản" /></a>
            <a href="http://quochoi.vn" target="_blank" rel="noreferrer"><img src="/images/quochoi.png" style={{ width: '100%' }} alt="Quốc Hội" /></a>
            <a href="http://chinhphu.vn" target="_blank" rel="noreferrer"><img src="/images/chinhphu.png" style={{ width: '100%' }} alt="Chính Phủ" /></a>
            <a href="http://www.mof.gov.vn" target="_blank" rel="noreferrer"><img src="/images/botaichinh.png" style={{ width: '100%' }} alt="Bộ Tài Chính" /></a>
          </div>
        </div>

        {/* Workflow Area */}
        <div style={{ flex: 1 }}>
          {/* Breadcrumbs */}
          <div style={{ fontSize: '12px', color: '#1a4f7a', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <span style={{ cursor: 'pointer' }}>Trang chủ</span>
            <span style={{ margin: '0 8px' }}>|</span>
            <b>Tiếp công dân và cập nhật nội dung</b>
            <span style={{ fontSize: '10px', marginLeft: '5px' }}>&gt;</span>
          </div>
          <LoanWorkflow />
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px', borderTop: '2px solid #1a4f7a', marginTop: '20px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', color: '#1a4f7a', marginBottom: '10px' }}>CỔNG THÔNG TIN ĐIỆN TỬ KHO BẠC NHÀ NƯỚC</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Số 32 Cát Linh - Đống Đa - Hà Nội | Tel: (84-24) 62 764 300 | Email: congttdtkbnn@vst.gov.vn
        </div>
      </div>
    </div>
  );
}

export default App;
