# Ubuntu Setup Guide

> Hướng dẫn dựng môi trường để chạy **Linux Programming Dashboard** thật trên máy Linux. Tested trên Ubuntu 22.04 / 24.04 và WSL2 Ubuntu.

## 1. Cài gói nền tảng

```bash
sudo apt update
sudo apt install -y \
    build-essential \
    linux-headers-$(uname -r) \
    kmod \
    inotify-tools \
    strace \
    net-tools \
    iproute2 \
    iputils-ping \
    traceroute \
    dnsutils \
    procps \
    curl \
    git
```

Kiểm tra kernel header:
```bash
ls /lib/modules/$(uname -r)/build || echo "MISSING headers"
```
Nếu missing trên WSL2, xem mục [WSL2](#wsl2-ghi-chú) bên dưới.

## 2. Cài Node.js 18+ và toolchain frontend

```bash
# nvm (cách an toàn nhất)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
node -v   # ≥ v20
npm  -v
```

## 3. Clone & cài dependencies

```bash
git clone <repo> linux-dashboard && cd linux-dashboard

# Backend
(cd backend  && npm install)

# Frontend
(cd frontend && npm install)

# Build kernel modules sample
(cd kernel-samples && make)

# Build userspace demos
(cd kernel-samples/userspace-demos && make)
```

## 4. Cấu hình sudoers (cho phép thao tác kernel/apt không cần password)

Backend dùng `sudo -n` cho các lệnh: `insmod`, `rmmod`, `dmesg -w`, `apt-get install/remove`, `tee /proc/...`. Cần cấu hình NOPASSWD cho user chạy backend:

```bash
sudo visudo -f /etc/sudoers.d/linux-dashboard
```

Dán nội dung (thay `your_user` bằng user của bạn):

```
your_user ALL=(root) NOPASSWD: /usr/sbin/insmod, /usr/sbin/rmmod, /usr/bin/dmesg, /usr/bin/tee, /usr/bin/apt-get, /usr/bin/apt
```

Lưu, kiểm tra:
```bash
sudo -n insmod   # phải KHÔNG hỏi password (sẽ in usage error)
```

> Đây là **chấp nhận đánh đổi tính tiện** với rủi ro bảo mật trong môi trường demo. Trong production tuyệt đối không làm thế. Xem `SECURITY.md`.

## 5. Chạy dev

Mở 2 terminal:

```bash
# Terminal 1 — backend (cổng 3001)
cd backend && npm run dev

# Terminal 2 — frontend (cổng 5173)
cd frontend && npm run dev
```

Mở `http://localhost:5173`.

Hoặc dùng script tổng:
```bash
./start.sh
```

## 6. Build kernel module qua dashboard

1. Mở tab **Kernel → Build & Run**.
2. Editor đã preload template `hello_module.c`. Click **Compile & Load**.
3. Sang tab **Kernel Logs** → **Start Realtime** để xem `dmesg` live.
4. Bấm **rmmod — Unload** để gỡ.

Dashboard build trong `backend/kernel-modules/<name>/` (gitignored).

## 7. WSL2 ghi chú

WSL2 dùng kernel riêng của Microsoft → `linux-headers-$(uname -r)` thường **không tồn tại** trong apt cache. Có 2 cách:

**A. Build kernel với header** (chính thống — phức tạp):
```bash
sudo apt install -y bc flex bison libssl-dev libelf-dev libncurses-dev
git clone --depth 1 https://github.com/microsoft/WSL2-Linux-Kernel.git
cd WSL2-Linux-Kernel
git checkout linux-msft-wsl-$(uname -r | grep -oE '[0-9]+\.[0-9]+')
cp Microsoft/config-wsl .config
make oldconfig && make modules_prepare
sudo mkdir -p /lib/modules/$(uname -r)/build
sudo cp -r . /lib/modules/$(uname -r)/build/
```

**B. Chạy trên VM thật** (Ubuntu Server / Multipass) — đơn giản hơn cho phần kernel module:
```bash
# trên Windows host
multipass launch -n linux-dash -c 2 -m 2G -d 10G
multipass shell linux-dash
```

## 8. Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| `insmod: ERROR: could not insert module ... Operation not permitted` | sudoers chưa cấu hình hoặc thiếu signing trên kernel có Secure Boot. Tạm `sudo mokutil --disable-validation` hoặc tắt Secure Boot. |
| `make: *** /lib/modules/.../build: No such file or directory.  Stop.` | thiếu `linux-headers`. Cài hoặc xem mục WSL2. |
| `dmesg: read kernel buffer failed: Operation not permitted` | `sudo sysctl kernel.dmesg_restrict=0` (tạm) hoặc thêm user vào nhóm `adm`/`systemd-journal`. |
| Frontend trắng/không kết nối | Check `backend/.env` `FRONTEND_URL=http://localhost:5173`, restart backend. |
| `inotifywait: command not found` | `sudo apt install inotify-tools`. |
| Demo `tcp-echo` báo `Address already in use` | Server cũ chưa chết, đợi 30s hoặc đổi port. |

## 9. Verify nhanh end-to-end

```bash
# 1. backend healthcheck
curl http://localhost:3001/api/health

# 2. compile sample
cd kernel-samples && make hello && lsmod | head

# 3. load
sudo insmod hello_module.ko greeting="OK"
dmesg | tail -3
sudo rmmod hello_module

# 4. demo userspace
cd userspace-demos && make
./fork_demo 3
./zombie_demo 4 &
ps -o pid,stat,comm $!
wait
```
