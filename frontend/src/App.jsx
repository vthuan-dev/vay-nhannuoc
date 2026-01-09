import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import LoanWorkflow from './components/LoanWorkflow';

function App() {
  const [time, setTime] = useState('');
  const [currentService, setCurrentService] = useState('vay-von');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.open(`https://vst.mof.gov.vn/webcenter/portal/kbnn/r/search?SearchInput=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getMenuLabel = () => {
    switch (currentService) {
      case 'vay-von': return 'Hỗ trợ vay vốn';
      case 'tien-treo': return 'Hỗ trợ lấy lại tiền treo';
      case 'tim-viec': return 'Tìm việc làm';
      case 'dat-dai': return 'Giải quyết đất đai';
      case 'nop-thue': return 'Nộp thuế';
      default: return 'Cổng thông tin hỗ trợ';
    }
  };

  const services = [
    { label: 'Vay vốn', id: 'vay-von' },
    { label: 'Hỗ trợ lấy lại tiền treo', id: 'tien-treo' },
    { label: 'Nộp thuế', id: 'nop-thue' },
    { label: 'Giải quyết đất đai', id: 'dat-dai' },
    { label: 'Tìm việc làm', id: 'tim-viec' }
  ];

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
      <div className="nav-container" style={{ position: 'relative', background: 'linear-gradient(to bottom, #1a4f7a 0%, #0d2a41 100%)', minHeight: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 }}>
        <ul id="menu" style={{ background: 'none', display: 'flex', listStyle: 'none', margin: 0, padding: 0 }}>
          <li className="menu-home"><a href="/" onClick={(e) => { e.preventDefault(); setCurrentService('vay-von'); }}>Trang chủ</a></li>
          <li className="menu-intro"><a href="#">Giới thiệu KBNN</a></li>
          <li className="menu-strategy"><a href="#">Chiến lược phát triển KBNN</a></li>

          {/* Dropdown Menu Item */}
          <li className="menu-hotro" style={{ position: 'relative' }} ref={dropdownRef}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setShowDropdown(!showDropdown); }}
              style={{ color: '#ffcc00', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
            >
              HỖ TRỢ PHÁP LÝ
              <span style={{ marginLeft: '5px', fontSize: '10px', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
            </a>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '220px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                borderRadius: '0 0 8px 8px',
                padding: '10px 0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                zIndex: 1001,
                animation: 'fadeSlideDown 0.3s ease-out'
              }}>
                {services.map((item) => (
                  <a
                    key={item.id}
                    href="#"
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      color: '#1a4f7a',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: currentService === item.id ? 'bold' : 'normal',
                      backgroundColor: currentService === item.id ? 'rgba(26, 79, 122, 0.1)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(26, 79, 122, 0.05)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = currentService === item.id ? 'rgba(26, 79, 122, 0.1)' : 'transparent'}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentService(item.id);
                      setShowDropdown(false);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </li>
        </ul>

        <div className="search-container" style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Tìm kiếm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ padding: '4px 10px', fontSize: '12px', border: 'none', borderRadius: '4px 0 0 4px', width: '150px' }}
          />
          <button
            onClick={handleSearch}
            style={{ background: '#4a90c2', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '0 4px 4px 0' }}
          >
            <img src="/images/search_bt.png" width="16" alt="Search" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-container" style={{ display: 'flex', padding: '10px', backgroundColor: '#fff' }}>
        {/* Left Sidebar */}
        <div className="sidebar" style={{ width: '275px', marginRight: '10px', flexShrink: 0 }}>
          <div className="leftmenu-content">
            {[
              { label: 'Đại Hội Đảng Bộ', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/lm/dhdb' },
              { label: 'Hỏi đáp - Kiến nghị', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/lm/vhnkb3' },
              { label: 'Văn hóa nghề kho bạc', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/lm/vhnkb' },
              { label: 'Tiếp công dân và cập nhật nội dung', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/lm/vhnkb34' },
              { label: 'Hệ thống văn bản', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/lm/htvb' },
              { label: 'Tin tức sự kiện', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/ttsk' },
              { label: 'Thông báo', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/tb' },
              { label: 'Báo cáo thường niên hệ thống KBNN', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/baocaothuongnienhtkbnn' },
              { label: 'Tin media', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/media' },
              { label: 'Trái phiếu Chính phủ', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/tpcp' },
              { label: 'KBNN chuyển đổi mô hình tổ chức', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/kbnncdmhtcbmm' },
              { label: 'Tỷ giá hạch toán', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/tght' },
              { label: 'Thông tin đấu thầu', href: 'https://vst.mof.gov.vn/webcenter/portal/kbnn/r/o/tght' }
            ].map((item, idx) => (
              <a key={idx} href={item.href} className="x2by" target="_blank" rel="noreferrer">
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
        <div className="workflow-area" style={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumbs */}
          <div style={{ fontSize: '12px', color: '#1a4f7a', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setCurrentService('vay-von')}>Trang chủ</span>
            <span style={{ margin: '0 8px' }}>|</span>
            <b>{getMenuLabel()}</b>
          </div>
          <LoanWorkflow service={currentService} />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Footer */}
      <div style={{ padding: '20px', borderTop: '2px solid #1a4f7a', marginTop: '20px', textAlign: 'center' }}>
        <div style={{ fontWeight: 'bold', color: '#1a4f7a', marginBottom: '10px' }}>CỔNG THÔNG TIN ĐIỆT TỬ KHO BẠC NHÀ NƯỚC</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Số 32 Cát Linh - Đống Đa - Hà Nội | Tel: (84-24) 62 764 300 | Email: congttdtkbnn@vst.gov.vn
        </div>
      </div>
    </div>
  );
}

export default App;
