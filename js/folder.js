export function folderKey(carId, directionId) {
  const car = String(carId || "").trim();
  const direction = String(directionId || "").trim();
  if (!car || !direction || car.includes("/") || direction.includes("/")) {
    throw new Error("Нужны отдельные идентификаторы автомобиля и направления");
  }
  return `${car}/${direction}`;
}

export function nodeFolderKey(carId, directionId, checkpointId) {
  const node = String(checkpointId || "").trim();
  if (!node || node.includes("/")) {
    throw new Error("Нужен идентификатор узла");
  }
  return `${folderKey(carId, directionId)}/${node}`;
}

export function parseFolderKey(key) {
  const parts = String(key || "").split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error("Некорректный ключ папки");
  }
  return { carId: parts[0], directionId: parts[1], checkpointId: parts[2] || null };
}
