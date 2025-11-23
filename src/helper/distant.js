export const distant = (a, b) => {
  const r1 = a.size / 2;
  const r2 = b.size / 2;

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return { dist, r1, r2 };
};

export const isCollide = (a, b, dist = null) => {
    const r1 = a.size / 2;
    const r2 = b.size / 2;

  if (dist === null) {
    dist = Math.hypot(a.x - b.x, a.y - b.y); // หรือใช้ distant(a,b).dist
  }
  return dist <= r1 + r2;
};

export const isInside = (a, b, dist = null) => {
  const r1 = a.size / 2;

  if (dist === null) {
    dist = Math.hypot(a.x - b.x, a.y - b.y);
  }

  return dist <= r1; // true ถ้า b อยู่ภายใน a
};

export const isDistant = (a, b) => {
  const { dist, r1, r2 } = distant(a, b);
  return dist > r1 + r2; // ถ้า true → ไม่ชนกัน
};
