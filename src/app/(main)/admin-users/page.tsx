"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminUsersPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATES CHO MODAL RESET MẬT KHẨU ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees")
      .select("id, full_name, phone_number, email, status, role, departments(name), locations(name), positions(title)")
      .order("created_at", { ascending: false });
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    await supabase.from("employees").update({ status: "active" }).eq("id", id);
    fetchEmployees();
  };

  const handleReject = async (id: string) => {
    await supabase.from("employees").update({ status: "inactive" }).eq("id", id);
    fetchEmployees();
  };

  // --- LOGIC MỞ MODAL & XỬ LÝ RESET ---
  const openResetModal = (userId: string) => {
    setSelectedUserId(userId);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setIsResetModalOpen(true);
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    if (newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsSubmittingReset(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, newPassword })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("✅ Đã đổi mật khẩu thành công! Hãy báo nhân sự dùng mật khẩu mới này nhé.");
        setIsResetModalOpen(false);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối Server.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  if (loading) return <div className="text-center py-10 animate-pulse text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="animate-fade-in relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Quản lý Tài khoản</h2>
        <span className="text-sm text-gray-500">Tổng: {employees.length} nhân sự</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
            
            {/* Phần thông tin phía trên */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{emp.full_name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{emp.phone_number || emp.email.replace('@congty.local', '')}</p>
                </div>
                {emp.status === "pending" && <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-1 rounded-md font-bold">Chờ duyệt</span>}
                {emp.status === "active" && <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-1 rounded-md font-bold">Hoạt động</span>}
                {emp.status === "inactive" && <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-1 rounded-md font-bold">Đã khóa</span>}
              </div>
              <div className="text-sm text-gray-500 space-y-1 mb-4 mt-3">
                <p className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> {emp.departments?.name || "Chưa cập nhật"}</p>
                <p className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> {emp.locations?.name || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Phần các nút thao tác phía dưới */}
            <div className="mt-auto">
              {emp.status === "pending" && (
                <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => handleApprove(emp.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition">Phê duyệt</button>
                  <button onClick={() => handleReject(emp.id)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition">Từ chối</button>
                </div>
              )}
              
              <div className={emp.status === "pending" ? "mt-2" : "mt-4 pt-4 border-t border-gray-100"}>
                <button 
                  onClick={() => openResetModal(emp.id)} 
                  className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-2 rounded-lg text-sm font-bold hover:bg-orange-100 transition"
                >
                  🔑 Cấp lại Mật khẩu
                </button>
              </div>
            </div>
            
          </div>
        ))}
      </div>

      {/* ================= MODAL CẤP LẠI MẬT KHẨU ================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Cấp lại Mật khẩu</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={submitResetPassword} className="p-5 space-y-4">
              
              {/* Ô Mật khẩu mới */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="Tối thiểu 6 ký tự" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Ô Xác nhận mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận lại mật khẩu</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="Nhập lại cho khớp" 
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 font-medium">Mật khẩu xác nhận chưa khớp!</p>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmittingReset || newPassword !== confirmPassword || newPassword.length < 6} className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 shadow-md disabled:bg-orange-300">
                  {isSubmittingReset ? "Đang xử lý..." : "Lưu mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}