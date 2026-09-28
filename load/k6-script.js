import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const targetPath = __ENV.TARGET_PATH || "/health";
const token = __ENV.AUTH_TOKEN || "";

export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "2m", target: 100 },
    { duration: "2m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = http.get(`${baseUrl}${targetPath}`, { headers });
  check(response, {
    "response is successful": (result) => result.status >= 200 && result.status < 300,
  });
  sleep(0.1);
}
