# Security Considerations

> Tài liệu này liệt kê các điểm rủi ro của Linux Programming Dashboard và cách giảm thiểu. Hệ thống được thiết kế cho **mục đích học tập / demo trên máy đơn**, KHÔNG phù hợp triển khai public.

## 1. Phạm vi tin cậy

| Component | Vị trí | Tin cậy |
|---|---|---|
| Browser frontend | localhost:5173 | tin cậy (single-user demo) |
| Backend Express | localhost:3001 | tin cậy hoàn toàn (chạy trên cùng máy) |
| Linux kernel | local | tin cậy |
| User commands qua terminal | input từ user | **không tin cậy** — cần kiểm soát |
| Code .c gửi qua KernelBuilder | input từ user | **rủi ro cao** — chạy trong ring 0 |

## 2. Các rủi ro chính

### R1. Arbitrary command execution

Endpoint `terminal:execute` socket spawn trực tiếp `bash -c <user_input>`.
* **Tác động**: nếu backend bind ra public network, kẻ xấu có root.
* **Giảm thiểu**:
  * Backend bind mặc định `localhost`. Không expose ra LAN.
  * `commandValidator.js` có blacklist (`rm -rf /`, fork bomb, `dd if=/dev/zero of=/dev/sda`, ...) và injection pattern check. Hiện chưa được wire vào tất cả endpoint — nên gọi `validateCommand()` trước mỗi spawn nếu deploy.
  * Đặt CORS chặt: `FRONTEND_URL` env phải đúng origin.

### R2. Privilege escalation qua sudoers NOPASSWD

`UBUNTU_SETUP.md` hướng dẫn `NOPASSWD` cho `insmod, rmmod, dmesg, apt-get, tee` để dashboard hoạt động. Tổ hợp `tee` + path tuỳ ý cho phép ghi vào bất kỳ file nào.
* **Giảm thiểu**:
  * Giới hạn path: `/usr/bin/tee /proc/dashboard*` thay vì `/usr/bin/tee` chung.
  * Hoặc dùng systemd service chạy với `CapabilityBoundingSet=CAP_SYS_MODULE CAP_SYSLOG`.
  * Chỉ áp dụng cấu hình này cho user chuyên dùng (không phải user thường ngày).

### R3. Path traversal trong file API

Routes `/api/shell/files/*` chấp nhận `dir`, `file` từ client.
* **Hiện trạng**: chặn `..` đơn giản (`if (path.includes('..')) reject`).
* **Hạn chế**: bypass được bằng `/etc/.././etc/shadow` (sau normalize không có `..` literal). Hiện check là **string include**, không phải resolve.
* **Khuyến nghị production**:
  ```js
  const SAFE_ROOT = '/home/user/sandbox';
  const resolved = path.resolve(SAFE_ROOT, userPath);
  if (!resolved.startsWith(SAFE_ROOT + path.sep)) reject();
  ```

### R4. Kernel code execution (KernelBuilder)

User dán code C → backend `make` → `insmod`. Code chạy ring 0:
* có thể `panic()` cả máy
* có thể đọc/ghi mọi vùng kernel memory
* có thể cài rootkit thường trực

**Giảm thiểu**:
* Chỉ chạy trong **VM throw-away** hoặc snapshot trước khi demo.
* Tuyệt đối không bật trên server làm việc thực.
* Bật **kernel lockdown** (`integrity` / `confidentiality`) nếu cần thử nghiệm an toàn — module unsigned sẽ bị từ chối.
* Hoặc bắt buộc Module Signing với key riêng và unsign module cần test thủ công trước khi load.

### R5. Netfilter logger module

`netfilter_logger.c` đăng ký hook ở `NF_INET_PRE_ROUTING` và **chỉ log** (`return NF_ACCEPT`). Không drop, không alter.
* Spam dmesg nếu `sample_rate=1` trên link bận → mất log khác do log buffer cyclic.
* Khuyến nghị giữ `sample_rate ≥ 32` khi demo.

### R6. Information disclosure qua /proc và logs

Endpoint `journalctl`, `/var/log/auth.log` lộ:
* user name từng đăng nhập
* lịch sử failed login (IP nguồn, username)
* nội dung dmesg (kernel pointer leak nếu `kernel.kptr_restrict = 0`)

**Giảm thiểu**:
* `sudo sysctl kernel.kptr_restrict=2` và `kernel.dmesg_restrict=1`.
* Filter ở backend trước khi trả về (mask địa chỉ IP, redact username).

### R7. Resource exhaustion

* Loop `for_each_process()` trong kernel module với hàng nghìn task → giữ rcu read lock lâu.
* `inotifywait -m` trên thư mục lớn → flood event.
* Spawn `top -b -n 1` mỗi 2s qua `metrics:start` × N socket → fork bomb gián tiếp.

**Giảm thiểu**:
* Limit max concurrent socket sessions (đã có `activeSessions` Map; chưa enforce).
* Throttle `metrics:start` mỗi 2s, không 200ms.
* Dùng `cgroups` v2 đặt `pids.max`, `cpu.max` cho service.

### R8. Secure Boot & Module signing

Trên distro bật Secure Boot, kernel chỉ load module được sign.
* `insmod hello_module.ko` sẽ fail với `Required key not available`.
* **Workaround**: tắt Secure Boot trong UEFI; hoặc enroll MOK key (`mokutil --import key.der`) và sign module bằng `kmodsign`.

## 3. Hardening checklist (nếu cần đem chấm chính thức)

- [ ] `helmet()` đã bật (đã có).
- [ ] CORS hạn chế origin (đã có `FRONTEND_URL`).
- [ ] Bind backend vào `127.0.0.1`, không `0.0.0.0` — sửa trong `index.js` `server.listen(PORT, '127.0.0.1')`.
- [ ] Wire `validateCommand` vào TẤT CẢ socket handlers spawn shell.
- [ ] Thay `path.includes('..')` bằng `path.resolve` + prefix check.
- [ ] Sudoers giới hạn từng binary với từng path cụ thể.
- [ ] Snapshot VM trước khi demo kernel module mới.
- [ ] Tắt KernelBuilder ở môi trường thật (env `DISABLE_KBUILDER=1`).
- [ ] Cài rate-limit (express-rate-limit) cho REST.
- [ ] Logging — không log token / password vào winston file.
- [ ] Chạy backend dưới user riêng (linux-dash) với cgroup giới hạn RAM.
