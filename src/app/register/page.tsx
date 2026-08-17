"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function RegisterPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    fullName: "",
    departmentId: "",
    locationId: "",
    positionId: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Tự động kéo dữ liệu danh mục từ Supabase khi mở trang
  useEffect(() => {
    const fetchData = async () => {
      const { data: deptData } = await supabase.from("departments").select("*");
      const { data: locData } = await supabase.from("locations").select("*");
      const { data: posData } = await supabase.from("positions").select("*");

      if (deptData) setDepartments(deptData);
      if (locData) setLocations(locData);
      if (posData) setPositions(posData);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Tạo email ảo từ số điện thoại
    const virtualEmail = `${formData.phone}@congty.local`;

    const { error } = await supabase.auth.signUp({
      email: virtualEmail, // Gửi email ảo lên Supabase
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone_number: formData.phone,
          department_id: formData.departmentId,
          location_id: formData.locationId,
          position_id: formData.positionId,
        },
      },
    });

    if (error) {
      setMessage(`❌ Lỗi: ${error.message}`);
    } else {
      setMessage("✅ Đăng ký thành công! Vui lòng chờ Quản lý phê duyệt.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng Ký Tài Khoản</h2>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Họ và Tên</label>
            <input required name="fullName" type="text" onChange={handleChange} className="mt-1 w-full border rounded p-2 text-black" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input 
              required 
              name="phone" 
              type="tel" 
              pattern="[0-9]{10,11}" 
              title="Vui lòng nhập số điện thoại hợp lệ (10-11 số)"
              onChange={handleChange} 
              className="mt-1 w-full border rounded p-2 text-black" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input required name="password" type="password" minLength={6} onChange={handleChange} className="mt-1 w-full border rounded p-2 text-black" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phòng ban</label>
            <select required name="departmentId" onChange={handleChange} className="mt-1 w-full border rounded p-2 text-black">
              <option value="">-- Chọn phòng ban --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Khu vực làm việc (Bắt IP)</label>
            <select required name="locationId" onChange={handleChange} className="mt-1 w-full border rounded p-2 text-black">
              <option value="">-- Chọn khu vực --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Chức vụ</label>
            <select required name="positionId" onChange={handleChange} className="mt-1 w-full border rounded p-2 text-black">
              <option value="">-- Chọn chức vụ --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? "Đang xử lý..." : "Đăng Ký"}
          </button>
        </form>

        {message && <div className="mt-4 text-center font-medium text-sm text-red-600">{message}</div>}
      </div>
    </div>
  );
}