export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Bán kính Trái Đất (mét)
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Trả về khoảng cách làm tròn (mét)
}