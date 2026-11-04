# Tính toán dung lượng máy chủ — Nông Trại Vui Vẻ

Tài liệu này trả lời câu hỏi: **nếu game có người dùng lớn thì cần server đến mức nào?**
Số liệu dưới đây là mô hình lập kế hoạch, không phải cam kết hiệu năng. Cấu hình thật phải đo bằng tải thực tế.

---

## 1. Kiến trúc hiện tại (bản demo)

- 1 tiến trình **Node.js** vừa phục vụ file tĩnh vừa chạy API.
- **SQLite** một file, chế độ WAL.
- Session lưu trong SQLite, cookie `HttpOnly`.
- Mật khẩu băm bằng **scrypt**, mỗi user một salt.
- Bạn bè, lời mời, tin nhắn, hành động tưới/quà lưu trong SQLite.
- Tiến trình game lưu thành một JSON khoảng **5–20 KB/user**.
- Client polling social mỗi **20 giây**, heartbeat mỗi **25 giây**, autosave lên server sau **1,4 giây** khi có thay đổi.
- Mỗi tài khoản giữ **một session hoạt động**; đăng nhập thiết bị mới sẽ thu hồi session cũ.
- Bản demo chạy HTTP cục bộ. Khi triển khai thật phải đặt sau **HTTPS/reverse proxy**, bật cookie `Secure`, backup và giám sát.

Kiến trúc này rất phù hợp cho **1.000–10.000 người dùng hoạt động/ngày (DAU)** trên một máy nhỏ.
Trên mức đó, SQLite và một tiến trình Node sẽ thành nút thắt.

### API chính

```
POST /api/auth/register        Đăng ký
POST /api/auth/login           Đăng nhập
POST /api/auth/logout          Đăng xuất
GET  /api/me                   Hồ sơ + social
GET  /api/social               Bạn bè, lời mời, unread
POST /api/friends/request      Gửi lời mời
POST /api/friends/respond      Đồng ý / từ chối
POST /api/friends/:id/water    Tưới giúp
POST /api/friends/:id/gift     Nhận quà
POST /api/friends/:id/chat     Gửi tin nhắn
GET  /api/game/state           Tải save
PUT  /api/game/state           Lưu save
GET  /api/admin/*              Thống kê, users, capacity, audit
```

---

## 2. Giả định tính toán

| Thông số | Giá trị dùng để tính |
|---|---|
| DAU (người dùng hoạt động/ngày) | 1k · 10k · 100k · 1M · 5M |
| Tỷ lệ online cùng lúc / DAU | 20% · 15% · 12% · 8% · 6% |
| Request / người online / phút | 12 · 12 · 15 · 18 · 20 |
| Payload JSON trung bình | 2,5 KB/request |
| Dung lượng save game | 20 KB/user |
| Số bản backup | 3 bản |
| Tải mỗi vCPU Node | ~650 req/s (đã chừa headroom) |
| Tải mỗi vCPU Postgres | ~450 req/s (đọc/ghi hỗn hợp) |
| Redis cho session/presence | ~1 GB cho 250k người online |

`Request/người/phút` gồm polling social, heartbeat, autosave, thao tác chơi và chat. Nếu chuyển sang WebSocket/SSE thì con số này giảm mạnh, nhưng server phải giữ kết nối lâu.

---

## 3. Bảng dung lượng theo quy mô

| DAU | Peak online | Req/s | App Node | Postgres | Redis | Ổ đĩa | Băng thông/ngày |
|---:|---:|---:|---|---|---|---:|---:|
| 1.000 | 200 | 40 | 1 vCPU / 2 GB | 2 vCPU / 8 GB | 1 GB | 11 GB | 8,2 GB |
| 10.000 | 1.500 | 300 | 1 vCPU / 2 GB | 2 vCPU / 8 GB | 1 GB | 11 GB | 61,8 GB |
| 100.000 | 12.000 | 3.000 | 5 vCPU / 8 GB | 7 vCPU / 28 GB | 1 GB | 16 GB | 618 GB |
| 1.000.000 | 80.000 | 24.000 | 37 vCPU / 56 GB | 54 vCPU / 216 GB | 1 GB | 68 GB | 4,9 TB |
| 5.000.000 | 300.000 | 100.000 | 154 vCPU / 231 GB | 223 vCPU / 892 GB | 2 GB | 297 GB | 20,6 TB |

> Băng thông tính theo `peak online × request/phút × 1.440 phút × 2,5 KB`.
> Thực tế có thể giảm 40–70% nhờ nén JSON, cache, CDN cho ảnh/tĩnh và gộp polling.

### Cách đọc bảng

- **1k–10k DAU:** một VPS 2 vCPU / 4 GB, SQLite, backup định kỳ là đủ cho bản demo. Nên tách app và database khi có 10k.
- **100k DAU:** cần ít nhất **2 app node** sau load balancer, Postgres riêng, Redis session, CDN. SQLite không còn phù hợp.
- **1M DAU:** cần **cluster app 4–8 node** (tổng ~40 vCPU), Postgres có read replica, Redis, queue, CDN, monitoring. Không chạy một process Node.
- **5M DAU:** cần nhiều region, sharding hoặc partition theo vùng, WebSocket gateway, data pipeline; đội vận hành riêng.

---

## 4. Chi phí tham khảo

Đây là giá VPS/cloud phổ thông, chưa gồm CDN, backup, email, giám sát, nhân sự.

| Quy mô | Cấu hình gợi ý | Chi phí/tháng (ước tính) |
|---|---|---:|
| 1k DAU | 1 VPS 2 vCPU/4 GB + object storage | 10–25 USD |
| 10k DAU | 2 app 2 vCPU/4 GB + Postgres 2 vCPU/4 GB + Redis 1 GB | 40–110 USD |
| 100k DAU | 3 app 4 vCPU/8 GB + Postgres 8 vCPU/32 GB + Redis 4 GB + LB/CDN | 350–900 USD |
| 1M DAU | 8 app 8 vCPU/16 GB + Postgres 32 vCPU/128 GB + replica + Redis 16 GB + CDN/queue | 3.000–8.000 USD |
| 5M DAU | 20+ app node, Postgres cluster, Redis cluster, multi-region | 15.000 USD+ |

Chi phí thực tế phụ thuộc nhà cung cấp, region, lưu lượng và mức dự phòng.

---

## 5. Nút thắt và lộ trình nâng cấp

### 5.1. SQLite
- Ghi tuần tự, khóa ghi toàn file. Ổn với vài chục write/s, không ổn với hàng nghìn write/s.
- **Mốc chuyển:** khoảng **10k DAU** hoặc khi write > 50/s.
- Chuyển sang **PostgreSQL**, giữ schema tương tự. Dùng connection pool, index cho `friendships`, `messages`, `sessions`.

### 5.2. Session
- Hiện lưu SQLite; mỗi request đọc DB.
- **Mốc chuyển:** 10k DAU hoặc > 100 request/s.
- Chuyển session sang **Redis** với TTL; cookie vẫn là token ngẫu nhiên.

### 5.3. Presence / online
- Hiện dùng `last_seen` trong SQLite + polling.
- Ở 100k+ nên dùng **Redis TTL** (`presence:user:<id>` TTL 120s), không ghi DB mỗi heartbeat.
- 1M+ nên dùng **WebSocket/SSE** thay polling 20s; giảm request và tăng trải nghiệm.

### 5.4. Chat
- Hiện lưu SQLite, tải 50 tin gần nhất.
- 100k+ chuyển sang bảng `messages` Postgres có partition theo tháng, hoặc Redis Stream + lưu lạnh.
- 1M+ cần WebSocket gateway, pub/sub (Redis/NATS), rate limit theo user.

### 5.5. State game
- JSON 20 KB/user tải/ghi mỗi autosave. 1M user = 20 GB; 3 backup = 60 GB.
- Không nên ghi toàn bộ JSON mỗi thao tác ở quy mô lớn.
- 100k+: tách **state theo từng phần** (plots, animals, inventory) hoặc dùng document store; autosave theo delta.
- 1M+: cache state nóng trong Redis, ghi async, snapshot định kỳ.

### 5.6. File tĩnh
- Ảnh, JS, CSS, screenshot nên đặt sau **CDN** ngay từ 10k DAU.
- Bật gzip/brotli, cache immutable cho asset có hash.

### 5.7. Admin
- Dashboard hiện query SQLite trực tiếp. Ở quy mô lớn, đọc từ **read replica** hoặc kho analytics, không chạy query nặng trên primary.
- Audit log tách bảng, retention 90–365 ngày.

---

## 6. Cấu hình khuyến nghị theo mốc

### 1k DAU
- 1 VPS: 2 vCPU, 4 GB RAM, 40 GB SSD.
- Node + SQLite, backup file mỗi 6 giờ.
- CDN chưa bắt buộc.

### 10k DAU
- 2 app node: 2 vCPU / 4 GB mỗi node sau load balancer.
- Postgres 2 vCPU / 4 GB (hoặc managed).
- Redis 1 GB cho session.
- Object storage + CDN cho ảnh.
- Backup PITR.

### 100k DAU
- 3 app node: 4 vCPU / 8 GB.
- Postgres 8 vCPU / 32 GB + read replica.
- Redis 4 GB (session, presence, cache).
- Load balancer, CDN, queue (BullMQ/SQS), monitoring.
- Tách worker cho chat/notification.

### 1M DAU
- 8 app node: 8 vCPU / 16 GB (auto-scaling).
- Postgres 32 vCPU / 128 GB + 2 read replica.
- Redis cluster 16 GB.
- WebSocket gateway 4–8 node.
- CDN, object storage, log/metrics stack.
- Multi-AZ, backup, disaster recovery.

### 5M DAU
- 20+ app node nhiều region.
- Postgres shard/partition hoặc CockroachDB/AlloyDB.
- Redis cluster, Kafka/NATS, data warehouse.
- Đội SRE, on-call, status page.

---

## 7. Công thức máy tính trong admin

Tab **Dung lượng** trong `/admin.html` dùng cùng công thức:

```
peak        = DAU × tỷ_lệ_online
req_per_sec = peak × request_mỗi_người_mỗi_phút / 60
app_vCPU    = ceil(req_per_sec / 650)
app_RAM     = app_vCPU × 1.5 GB
pg_vCPU     = max(2, ceil(req_per_sec / 450))
pg_RAM      = max(4, pg_vCPU × 4 GB)
redis_GB    = max(1, ceil(peak / 250.000))
storage_GB  = max(5, ceil(DAU × 20 KB × 3 / 1.048.576 + 10))
bandwidth   = peak × req_mỗi_người_mỗi_phút × 1.440 × 2,5 KB
```

Có thể gọi API:

```
GET /api/admin/capacity?dau=100000&concurrency=0.12&req=15
```

---

## 8. Kết luận ngắn

- **Bản hiện tại** chạy tốt ở quy mô **vài nghìn người dùng** trên một VPS nhỏ.
- **10k DAU** nên tách app + Postgres + Redis; chi phí vài chục đến hơn trăm USD/tháng.
- **100k DAU** cần cluster nhỏ, CDN, monitoring; hàng trăm USD/tháng.
- **1M DAU** cần hạ tầng production thực sự: cluster app, Postgres replica, Redis, WebSocket, đội vận hành; vài nghìn USD/tháng.
- **5M DAU** là bài toán multi-region/sharding, không chỉ “thuê server to hơn”.

Điều quan trọng nhất không phải chọn server thật to ngay, mà là **tách các lớp** (app, DB, session, chat, file tĩnh) trước khi chạm mốc 10k DAU. Khi đó việc scale chỉ là thêm node, không phải viết lại game.
