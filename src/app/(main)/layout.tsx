"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); 
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // States cho Modal Đổi mật khẩu
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    
    const { data } = await supabase.from("employees")
      .select("*, departments(name), positions(title)")
      .eq("id", user.id).single();
      
    setCurrentUser(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Hàm xử lý Đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra tính hợp lệ cơ bản
    if (newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsSubmittingPassword(true);
    
    // Gọi API của Supabase để cập nhật mật khẩu
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setIsSubmittingPassword(false);

    if (error) {
      alert("Lỗi đổi mật khẩu: " + error.message);
    } else {
      alert("✅ Đổi mật khẩu thành công! Lần đăng nhập sau bạn hãy dùng mật khẩu mới nhé.");
      // Reset form và đóng modal
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium animate-pulse">Đang tải hệ thống...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col md:flex-row relative">
      
      {/* ================= SIDEBAR (DESKTOP + MOBILE) ================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-xl text-blue-600">Hệ Thống</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2">Cá nhân</p>
          <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${pathname === "/dashboard" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
            📍 Chấm công
          </Link>
          
          {currentUser?.role === 'admin' && (
            <>
              <div className="h-px bg-gray-100 my-2"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2">Quản lý</p>
              
              <Link href="/admin-users" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${pathname === "/admin-users" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
                👥 Quản lý Nhân sự
              </Link>
              
              <Link href="/admin-history" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${pathname === "/admin-history" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
                🏢 Lịch sử Công ty
              </Link>

              <Link href="/admin-locations" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${pathname === "/admin-locations" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
                🌍 Cấu hình Khu vực
              </Link>

              <Link href="/admin-categories" onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${pathname === "/admin-categories" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
                📂 Quản lý Danh mục
              </Link>
            </>
          )}
        </nav>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOPBAR HEADER */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 text-gray-600 hover:bg-gray-100 rounded">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">Dashboard</h1>
          </div>
          
          <div className="relative">
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full border border-gray-200 hover:bg-gray-200 transition">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </button>

            {isProfileOpen && currentUser && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right animate-fade-in-up">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold text-lg leading-tight">{currentUser.full_name}</h3>
                    <p className="text-blue-100 text-sm">{currentUser.role === 'admin' ? 'Quản lý' : 'Nhân viên'}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{currentUser.phone_number || currentUser.email.replace('@congty.local', '')}</span>
                  </div>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false); // Đóng menu
                      setIsPasswordModalOpen(true); // Mở Modal đổi mật khẩu
                    }} 
                    className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Đổi mật khẩu
                  </button>
                  <button onClick={handleLogout} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100">Đăng xuất</button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 w-full max-w-5xl mx-auto">
          {children}
        </main>
      </div>

      {/* ================= MODAL ĐỔI MẬT KHẨU ================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Đổi mật khẩu</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Nhập mật khẩu mới" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Nhập lại mật khẩu" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmittingPassword}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md disabled:bg-blue-400"
                >
                  {isSubmittingPassword ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}