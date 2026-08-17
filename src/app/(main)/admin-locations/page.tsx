"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Trạng thái Modal & Form
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isFetchingAuto, setIsFetchingAuto] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    // Lấy user hiện tại để lưu vào log
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);

    // Kéo danh sách địa điểm
    const { data: locData } = await supabase.from("locations").select("*").order("name");
    if (locData) setLocations(locData);
    setLoading(false);
  };

  const openEditModal = (loc: any) => {
    setEditData({ ...loc }); // Copy dữ liệu ra form
    setIsEditModalOpen(true);
  };

  // Hàm "Ma thuật": Tự động bắt IP & GPS của người đang đứng tại đó
  const autoFetchCurrentData = async () => {
    setIsFetchingAuto(true);
    try {
      // 1. Lấy IP
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      
      // 2. Lấy GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setEditData({
              ...editData,
              current_ip: data.ip,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setIsFetchingAuto(false);
            alert("Đã bắt thành công IP và Tọa độ hiện tại!");
          },
          (error) => {
            setEditData({ ...editData, current_ip: data.ip });
            setIsFetchingAuto(false);
            alert("Đã bắt được IP, nhưng không thể lấy GPS. Vui lòng bật vị trí!");
          },
          { enableHighAccuracy: true }
        );
      } else {
         setEditData({ ...editData, current_ip: data.ip });
         setIsFetchingAuto(false);
      }
    } catch (e) {
      alert("Lỗi mạng khi lấy IP tự động.");
      setIsFetchingAuto(false);
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    
    // Tìm dữ liệu cũ để so sánh
    const oldData = locations.find(l => l.id === editData.id);
    
    // 1. Cập nhật vào bảng locations
    const { error: updateError } = await supabase.from("locations").update({
      current_ip: editData.current_ip,
      lat: editData.lat,
      lng: editData.lng,
      radius: editData.radius
    }).eq("id", editData.id);

    if (updateError) return alert("Lỗi cập nhật: " + updateError.message);

    // 2. Ghi Log lịch sử
    await supabase.from("location_logs").insert({
      location_id: editData.id,
      changed_by: currentUser?.id,
      old_ip: oldData.current_ip, new_ip: editData.current_ip,
      old_lat: oldData.lat, new_lat: editData.lat,
      old_lng: oldData.lng, new_lng: editData.lng,
      old_radius: oldData.radius, new_radius: editData.radius
    });

    alert("✅ Đã cập nhật cấu hình khu vực thành công!");
    setIsEditModalOpen(false);
    initData();
  };

  const viewLogs = async (locationId: string) => {
    const { data } = await supabase
      .from("location_logs")
      .select("*, employees(full_name)")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    
    setLogs(data || []);
    setIsLogModalOpen(true);
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Cấu hình Vị trí & Wifi</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map(loc => (
          <div key={loc.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-xl text-blue-700 mb-4">{loc.name}</h3>
            
            <div className="space-y-2 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="flex justify-between"><span className="font-medium">🌐 IP Wifi:</span> <span className="font-bold text-gray-900">{loc.current_ip || "Chưa thiết lập"}</span></p>
              <p className="flex justify-between"><span className="font-medium">📍 Tọa độ GPS:</span> <span>{loc.lat ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}` : "Chưa thiết lập"}</span></p>
              <p className="flex justify-between"><span className="font-medium">🎯 Bán kính cho phép:</span> <span>{loc.radius || 100} mét</span></p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => openEditModal(loc)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition flex justify-center items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                Chỉnh sửa
              </button>
              <button onClick={() => viewLogs(loc.id)} className="px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">
                Lịch sử
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CHỈNH SỬA */}
      {isEditModalOpen && editData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="bg-blue-600 p-4 text-white">
              <h3 className="font-bold text-lg">Cập nhật: {editData.name}</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <button 
                onClick={autoFetchCurrentData}
                disabled={isFetchingAuto}
                className="w-full bg-green-50 text-green-700 border border-green-200 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-100 transition active:scale-95"
              >
                {isFetchingAuto ? "Đang quét..." : "🚀 CẬP NHẬT TỰ ĐỘNG BẰNG MÁY NÀY"}
              </button>
              
              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Hoặc nhập thủ công</span>
                  <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IP Wifi Cố định</label>
                <input type="text" value={editData.current_ip || ""} onChange={e => setEditData({...editData, current_ip: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="VD: 118.71.204.220" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vĩ độ (Lat)</label>
                  <input type="number" value={editData.lat || ""} onChange={e => setEditData({...editData, lat: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kinh độ (Lng)</label>
                  <input type="number" value={editData.lng || ""} onChange={e => setEditData({...editData, lng: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bán kính hợp lệ (mét)</label>
                <input type="number" value={editData.radius || ""} onChange={e => setEditData({...editData, radius: parseInt(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2 bg-gray-50">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-md">Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ LOGS */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Lịch sử thay đổi khu vực</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-gray-700"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-gray-50">
              {logs.map(log => (
                <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-800">{log.employees?.full_name}</span>
                    <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                  {log.old_ip !== log.new_ip && (
                    <div className="grid grid-cols-2 gap-2 mt-1 bg-orange-50/50 p-2 rounded">
                      <div><span className="text-xs text-gray-400 block">IP cũ</span> <span className="text-gray-500 line-through">{log.old_ip || 'Trống'}</span></div>
                      <div><span className="text-xs text-gray-400 block">IP mới</span> <span className="font-medium text-orange-600">{log.new_ip}</span></div>
                    </div>
                  )}
                  {(log.old_lat !== log.new_lat || log.old_lng !== log.new_lng) && (
                    <div className="grid grid-cols-2 gap-2 mt-1 bg-blue-50/50 p-2 rounded">
                      <div><span className="text-xs text-gray-400 block">Tọa độ cũ</span> <span className="text-gray-500 line-through truncate block">{log.old_lat}, {log.old_lng}</span></div>
                      <div><span className="text-xs text-gray-400 block">Tọa độ mới</span> <span className="font-medium text-blue-600 truncate block">{log.new_lat}, {log.new_lng}</span></div>
                    </div>
                  )}
                </div>
              ))}
              {logs.length === 0 && <div className="text-center text-gray-400 py-5">Chưa có lịch sử thay đổi nào.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}