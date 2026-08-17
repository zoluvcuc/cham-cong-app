"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [attendances, setAttendances] = useState<any[]>([]);
  
  // Bộ lọc
  const [filterPreset, setFilterPreset] = useState("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterEmp, setFilterEmp] = useState("");
  const [filterDept, setFilterDept] = useState("");
  
  const [deptList, setDeptList] = useState<any[]>([]);
  const [empList, setEmpList] = useState<any[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAttendances();
  }, [filterPreset, customStart, customEnd, filterEmp, filterDept]);

  const fetchFilterOptions = async () => {
    const { data: depts } = await supabase.from("departments").select("id, name");
    const { data: emps } = await supabase.from("employees").select("id, full_name, department_id");
    if (depts) setDeptList(depts);
    if (emps) setEmpList(emps);
  };

  const getDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filterPreset) {
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "7days":
        start.setDate(today.getDate() - 7);
        break;
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "custom":
        return { start: customStart, end: customEnd };
    }
    
    const tzOffset = start.getTimezoneOffset() * 60000;
    const formatStr = (d: Date) => new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    return { start: formatStr(start), end: formatStr(end) };
  };

  const fetchAttendances = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    let query = supabase.from("attendance")
      .select(`id, date, check_in_time, check_out_time, employee_id, employees(full_name, department_id, departments(name))`)
      .order("date", { ascending: false })
      .order("check_in_time", { ascending: false });

    if (start && end) query = query.gte("date", start).lte("date", end);
    if (filterEmp) query = query.eq("employee_id", filterEmp);

    const { data } = await query;
    let finalData = data || [];
    if (filterDept) {
      finalData = finalData.filter((item: any) => item.employees?.department_id === filterDept);
    }

    setAttendances(finalData);
    setLoading(false);
  };

  const calculateTotalTime = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return "-";
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}p`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
        <h2 className="font-bold text-gray-800 mb-3">Lọc dữ liệu</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Thời gian</label>
            <select value={filterPreset} onChange={(e) => setFilterPreset(e.target.value)} className="w-full border rounded-lg p-2 text-gray-700 outline-none focus:border-blue-500">
              <option value="yesterday">Hôm qua</option>
              <option value="7days">7 ngày qua</option>
              <option value="thisMonth">Tháng này</option>
              <option value="lastMonth">Tháng trước</option>
              <option value="custom">Tùy chỉnh...</option>
            </select>
          </div>

          {filterPreset === "custom" && (
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Từ ngày</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full border rounded-lg p-2 text-gray-700 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Đến ngày</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full border rounded-lg p-2 text-gray-700 outline-none focus:border-blue-500" />
              </div>
            </div>
          )}

          <div className="col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Phòng ban</label>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-full border rounded-lg p-2 text-gray-700 outline-none focus:border-blue-500">
              <option value="">-- Tất cả --</option>
              {deptList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Nhân viên</label>
            <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} className="w-full border rounded-lg p-2 text-gray-700 outline-none focus:border-blue-500">
              <option value="">-- Tất cả --</option>
              {empList.filter(e => !filterDept || e.department_id === filterDept).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <div className="text-blue-600 font-medium animate-pulse">Đang tải dữ liệu...</div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 min-w-[150px] whitespace-nowrap">Nhân viên</th>
                <th className="px-4 py-4 min-w-[150px] whitespace-nowrap">Phòng ban</th>
                <th className="px-4 py-4 min-w-[100px] whitespace-nowrap">Ngày</th>
                <th className="px-4 py-4 whitespace-nowrap">Giờ vào</th>
                <th className="px-4 py-4 whitespace-nowrap">Giờ ra</th>
                <th className="px-4 py-4 text-right min-w-[130px] whitespace-nowrap">Tổng thời gian</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((att, idx) => (
                <tr key={att.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{att.employees?.full_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{att.employees?.departments?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(att.date).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">{formatTime(att.check_in_time)}</td>
                  <td className="px-4 py-3 font-semibold text-orange-500 whitespace-nowrap">{formatTime(att.check_out_time)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 whitespace-nowrap">
                    {calculateTotalTime(att.check_in_time, att.check_out_time)}
                  </td>
                </tr>
              ))}
              {!loading && attendances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}