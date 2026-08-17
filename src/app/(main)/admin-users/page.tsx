"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminUsersPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-center py-10 animate-pulse text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Tài khoản chờ duyệt</h2>
        <span className="text-sm text-gray-500">Tổng: {employees.length} nhân sự</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
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
            {emp.status === "pending" && (
              <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => handleApprove(emp.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition">Phê duyệt</button>
                <button onClick={() => handleReject(emp.id)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-200 transition">Từ chối</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}