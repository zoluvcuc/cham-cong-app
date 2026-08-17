"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const router = useRouter(); // Dùng để chuyển trang

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Tạo email ảo để đối chiếu với Supabase
    const virtualEmail = `${phone}@congty.local`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: virtualEmail, // Dùng email ảo để đăng nhập
      password,
    });

    if (authError) {
      setMessage("❌ Sai số điện thoại hoặc mật khẩu.");
      setLoading(false);
      return;
    }

    // 2. Kiểm tra trạng thái tài khoản trong bảng employees
    if (authData.user) {
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("status, role")
        .eq("id", authData.user.id)
        .single();

      if (empError || !empData) {
        setMessage("❌ Không tìm thấy hồ sơ nhân sự.");
        await supabase.auth.signOut();
      } else if (empData.status === "pending") {
        setMessage("⏳ Tài khoản của bạn đang chờ Quản lý phê duyệt.");
        await supabase.auth.signOut(); // Đăng xuất luôn vì chưa được phép vào
      } else if (empData.status === "inactive") {
        setMessage("⛔ Tài khoản đã bị khóa hoặc nhân viên đã nghỉ việc.");
        await supabase.auth.signOut();
      } else {
        // Tài khoản 'active' -> Chuyển hướng
        setMessage("✅ Đăng nhập thành công! Đang chuyển hướng...");
          router.push("/dashboard");         
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input 
              required 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)} 
              className="mt-1 w-full border rounded p-2 text-black" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input 
              required 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1 w-full border rounded p-2 text-black" 
            />
          </div>

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        {message && (
          <div className="mt-4 text-center font-medium text-sm text-red-600">
            {message}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </div>
        <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
            Quên mật khẩu? Vui lòng liên hệ Admin <br/>
            <span className="font-bold text-blue-600">Mr. Long - 0986.597.341</span> để được cấp lại.
        </p>
        </div>
      </div>
    </div>
  );
}