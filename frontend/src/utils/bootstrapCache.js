import { getBootstrap } from "../api/client";

const bootstrapPromises = new Map();
const bootstrapDataMap = new Map();

async function fetchBootstrapForStudent(studentId) {
  if (!studentId) {
    const res = await getBootstrap();
    return res.data;
  }

  const body = new URLSearchParams();
  body.append("student_id", String(studentId));
  const response = await fetch("/api/method/math_bell.api.bootstrap.get_bootstrap", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    body,
  });
  const data = await response.json();
  if (!response.ok || !data?.message || data.message.ok === false) {
    const reason = data?.message?.message || data?.message?.error || response.statusText;
    throw new Error(reason || "فشل تحميل بيانات البداية");
  }
  return data.message.data;
}

export async function loadBootstrap({ force = false, studentId = null } = {}) {
  const cacheKey = studentId || "__guest__";
  if (force) {
    bootstrapDataMap.delete(cacheKey);
    bootstrapPromises.delete(cacheKey);
  }

  if (bootstrapDataMap.has(cacheKey)) {
    return bootstrapDataMap.get(cacheKey);
  }

  if (!bootstrapPromises.has(cacheKey)) {
    const promise = fetchBootstrapForStudent(studentId).then((data) => {
      bootstrapDataMap.set(cacheKey, data);
      return data;
    });
    bootstrapPromises.set(cacheKey, promise);
  }

  return bootstrapPromises.get(cacheKey);
}

export function getCachedBootstrap(studentId = null) {
  const cacheKey = studentId || "__guest__";
  return bootstrapDataMap.get(cacheKey) || null;
}
