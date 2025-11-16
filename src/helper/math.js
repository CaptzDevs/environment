

export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function randInt(min, max, float = false) {
  if (max === undefined) {
    max = min;
    min = 0;
  }

  if (float) {
    // random ทศนิยม (รวม min, max)
    return Math.random() * (max - min) + min;
  }

  // random จำนวนเต็ม (รวม min, max)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
