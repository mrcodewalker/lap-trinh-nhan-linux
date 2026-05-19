# Presentation Flow — kịch bản chấm điểm đồ án

> Mục tiêu: 15–20 phút demo, mỗi điểm nhấn đều có **command thật** + **giải thích Linux concept** + **output kernel/userspace**.

## Cấu trúc trình bày (gợi ý)

```
0:00  Giới thiệu (1')
1:00  Architecture overview (2')
3:00  Module 1 — Shell (3')
6:00  Module 2 — Process & Network (4')
10:00 Module 3 — Kernel (6')
16:00 Demo Scenarios tổng hợp (3')
19:00 Q&A
```

---

## 0. Mở (slide 1, không bật dashboard)

> "Đồ án xây dựng một control center cho Linux system programming, gồm 3 module: Shell, Process/Network/IPC, và Kernel module. Mọi thao tác chạy thật bằng command Linux. Không có dữ liệu giả."

Mở `ARCHITECTURE.md` slide đoạn sơ đồ tổng → giải thích 3 layer (Browser ↔ Express+Socket.IO ↔ Linux).

## 1. Module 1 — Shell & Automation (3 phút)

### Demo 1.1 — Terminal thật

* Vào `/shell` → tab **Terminal**.
* Nói: "đây là xterm.js gắn với Socket.IO. Mỗi keystroke → bash -c trên server."
* Gõ:
  ```bash
  uname -a
  ps -ef | head
  cat /etc/os-release | head -3
  ```

### Demo 1.2 — File chmod + Explain button

* Tab **Files** → chọn 1 file → đổi permission 755.
* Click button **chmod** màu cyan ở toolbar → hiện Explain modal:
  * `chmod 755 file.sh` được break thành chmod / 755 / file.sh.
  * Flow `userspace → glibc → SYS_chmod → vfs_setattr → fs driver`.
* Nói: "đây là Explain System — gắn với knowledge base trong `data/linuxConcepts.js`, bao gồm command breakdown, syscalls, kernel flow, risks."

### Demo 1.3 — Cron

* Tab **Cron**. Add job `*/2 * * * * date >> /tmp/dash.log`.
* Sau 2 phút (hoặc click **Run Now**) → mở `/tmp/dash.log` qua Files để chứng minh chạy thật.
* Click **cron** Explain button → giải thích cú pháp `*/5 * * * *`.

## 2. Module 2 — Process & Network (4 phút)

### Demo 2.1 — Process tree + kill

* Tab **Processes**. Search `node`. Auto-refresh mỗi 2.5s.
* Click 1 process → modal **Info** đọc trực tiếp `/proc/<pid>/status`.
* Mở 1 terminal phụ: `sleep 300 &`. Quay lại dashboard, kill bằng `SIGTERM`.

### Demo 2.2 — Strace tab (mới)

* Tab **Strace**. Command: `ls -la /etc | head`.
* Click **Trace live** → stream `strace -f -tt -T` realtime.
* Stop → click **Counts** → bảng `strace -c` thống kê syscall tỉ lệ % thời gian, số call, errors.
* Nói: "strace dùng `ptrace(PTRACE_SYSCALL, ...)` để intercept mỗi syscall — đây là cùng cơ chế debugger gdb dùng."

### Demo 2.3 — Sockets / Network

* Tab **Sockets** — `ss -tulpn` → bảng listening ports + process owning.
* Tab **Net Tools** — Ping `8.8.8.8 -c 4`, traceroute, dig.

## 3. Module 3 — Kernel Module (6 phút) — TÂM ĐIỂM

### Demo 3.1 — Module Manager + lsmod

* `/kernel` → tab **Modules**. Hiện count modules đang load + kernel version + device nodes.
* Search `nf` để xem các module netfilter có sẵn.

### Demo 3.2 — Build + load HelloModule qua dashboard

* Tab **Build & Run**. Editor preload `hello_module.c`.
* Tick **Auto-load**, click **Compile & Load**.
* Streaming `make` line-by-line trong terminal panel.
* Sau khi success → tab **Kernel Logs** → **Start Realtime** → thấy `[hello_module] Hello from Linux Dashboard...`.
* Quay tab Modules → `hello_module` xuất hiện trong list.
* Click **rmmod — Unload** → dmesg log "module unloaded".

### Demo 3.3 — proc_module roundtrip

Vào terminal trong dashboard:
```bash
cd kernel-samples && make proc
sudo insmod proc_module.ko
echo "from-presentation-$(date +%T)" | sudo tee /proc/dashboard
cat /proc/dashboard
sudo rmmod proc_module
```

Click Explain `procfs` → flow:
```
cat /proc/dashboard
→ open()/read() → VFS
→ proc filesystem dispatch
→ proc_ops.proc_read = seq_read
→ show() callback → seq_printf
→ copy_to_user → cat output
```

### Demo 3.4 — Character device

```bash
make chardev
sudo insmod chardev_module.ko
ls -l /dev/dashboard       # major auto-allocated
sudo chmod 666 /dev/dashboard
echo "ipc-via-chardev" > /dev/dashboard
cat /dev/dashboard
sudo rmmod chardev_module
```

Click Explain `chardev` → diagram cdev_init → file_operations → copy_from_user.

### Demo 3.5 — Netfilter logger (highlight nếu có thời gian)

```bash
make netf
sudo insmod netfilter_logger.ko sample_rate=8
ping -c 8 127.0.0.1
sudo dmesg | grep nf_logger | tail
sudo rmmod netfilter_logger
```

Nói: "module hook vào PRE_ROUTING — đây là điểm đầu tiên packet đi qua netfilter, trước routing decision. Chỉ log, return NF_ACCEPT."

## 4. Demo Scenarios page (3 phút)

`/demo` → trang riêng cho 8 kịch bản.

* **Process → Fork** → click Run. Output show 3 child fork+exec, parent waitpid reap.
* **Process → Zombie** → Run. Output: `[parent] child=12345 will be ZOMBIE for 6s`. Đồng thời mở terminal: `ps -o pid,stat,comm 12345` → state `Z`.
* **Network → TCP roundtrip** → Run. Output server bind/listen/accept + client connect/echo.
* **Kernel → Load hello** → Run. Output insmod → dmesg → rmmod thành 1 flow.

Trong panel phải hiển thị `<ExplainCard/>` (concepts, syscalls) và `<ArchitectureFlow/>` (sơ đồ).

## 5. Câu hỏi dự kiến + cách trả lời

| Câu hỏi | Trả lời ngắn |
|---|---|
| Vì sao chọn Socket.IO không dùng WebSocket thuần? | reconnection tự động, room/event multiplexing, fallback long-polling. |
| Làm sao Node.js biết module .ko load thành công? | spawn `insmod` → exit code 0 + verify qua `lsmod \| grep <name>`. |
| Sao lại cần `M=$(CURDIR)` trong Makefile? | `CURDIR` được make tự đặt = thư mục gọi nó (set qua `cwd`), bất kể từ đâu invoke → đường dẫn module dir luôn đúng. |
| Strace có overhead không? | Có. Mỗi syscall thêm 2 ptrace context switch → có thể chậm 50–100×. Dùng `-c` thay `-f` cho production profiling. |
| Tại sao zombie không bị OS dọn? | OS chờ parent gọi wait() để parent đọc được exit code. Nếu parent exit, init nhận con nuôi và reap. |
| Module netfilter này có firewall không? | Không, chỉ log. Để firewall, sửa `return NF_DROP` có điều kiện. |
| Kernel module crash thì sao? | `Oops` → in stack vào dmesg, có thể rmmod được nếu Oops nhẹ. Nếu `panic()` → reboot. Demo trong VM. |

## 6. Cleanup sau demo

```bash
# Unload mọi module sample
cd kernel-samples && make unload-all

# Cleanup demo binaries
cd userspace-demos && make clean

# Xoá dashboard kernel-modules build dirs
rm -rf backend/kernel-modules/*
```
